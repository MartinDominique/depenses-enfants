import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Categorie, Depense, Parametres, Profil, RegleRemboursement, Relance, Statut } from "./types";

export const SELECT_DEPENSE = "*, categorie:categories(id, nom, ordre)";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profils } = await supabase.from("profiles").select("id, nom, email").order("cree_le");
  const liste = (profils ?? []) as Profil[];
  const moi = liste.find((p) => p.id === user.id);
  if (!moi) {
    throw new Error("Profil introuvable : le compte doit être créé par l'administrateur.");
  }
  const autre = liste.find((p) => p.id !== user.id) ?? null;
  return { supabase, user, moi, autre, profils: liste };
});

export const getCategories = cache(async (seulementActives = false) => {
  const supabase = await createClient();
  let q = supabase.from("categories").select("*").order("ordre").order("nom");
  if (seulementActives) q = q.eq("actif", true);
  const { data } = await q;
  return (data ?? []) as Categorie[];
});

export const getRegles = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("regles_remboursement").select("*").order("annee", { ascending: false });
  return (data ?? []) as RegleRemboursement[];
});

export const getParametres = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("parametres").select("*").eq("id", 1).maybeSingle();
  return (data ?? { id: 1, delai_relance_jours: 14 }) as Parametres;
});

export type FiltresDepenses = {
  statuts?: Statut[];
  mois?: string; // YYYY-MM
  annee?: number;
  categorie?: string;
  q?: string;
};

export async function getDepenses(filtres: FiltresDepenses = {}) {
  const supabase = await createClient();
  let q = supabase.from("depenses").select(SELECT_DEPENSE).order("date", { ascending: false }).order("cree_le", { ascending: false });

  if (filtres.statuts?.length) q = q.in("statut", filtres.statuts);
  if (filtres.mois && /^\d{4}-\d{2}$/.test(filtres.mois)) {
    const [a, m] = filtres.mois.split("-").map(Number);
    const debut = `${a}-${String(m).padStart(2, "0")}-01`;
    const finDate = new Date(Date.UTC(a, m, 1));
    const fin = finDate.toISOString().slice(0, 10);
    q = q.gte("date", debut).lt("date", fin);
  } else if (filtres.annee) {
    q = q.gte("date", `${filtres.annee}-01-01`).lte("date", `${filtres.annee}-12-31`);
  }
  if (filtres.categorie) q = q.eq("categorie_id", filtres.categorie);
  if (filtres.q?.trim()) {
    const terme = filtres.q.trim().replace(/[%,()]/g, " ");
    q = q.or(`description.ilike.%${terme}%,notes.ilike.%${terme}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Depense[];
}

export async function getDepense(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("depenses").select(SELECT_DEPENSE).eq("id", id).maybeSingle();
  return (data as Depense | null) ?? null;
}

export async function getRelances(depenseId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("relances").select("*").eq("depense_id", depenseId).order("envoye_le", { ascending: false });
  return (data ?? []) as Relance[];
}

/** Dépenses non payées (pour le bandeau solde), sans filtre. */
export async function getDepensesEnCours() {
  return getDepenses({ statuts: ["non_paye"] });
}

export async function urlRecuSignee(chemin: string | null | undefined) {
  if (!chemin) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("recus").createSignedUrl(chemin, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Années pour lesquelles il existe des dépenses (pour l'export). */
export async function getAnneesDisponibles() {
  const supabase = await createClient();
  const { data } = await supabase.from("depenses").select("date").order("date", { ascending: false });
  const annees = new Set<number>((data ?? []).map((d) => Number(String(d.date).slice(0, 4))));
  const courante = new Date().getFullYear();
  annees.add(courante);
  return [...annees].sort((a, b) => b - a);
}
