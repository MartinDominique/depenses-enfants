"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/data";
import type { EtatAction } from "./etat";

function revalider() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- Catégories

function lireCategorie(formData: FormData) {
  const nom = String(formData.get("nom") ?? "").trim();
  const type_proportion = String(formData.get("type_proportion") ?? "fixe") === "prorata" ? "prorata" : "fixe";
  const brut = String(formData.get("proportion_fixe") ?? "").replace(",", ".");
  const proportion_fixe = type_proportion === "fixe" ? Number(brut) : null;
  if (!nom) return { erreur: "Le nom est requis." };
  if (type_proportion === "fixe" && (!Number.isFinite(proportion_fixe) || proportion_fixe! < 0 || proportion_fixe! > 100))
    return { erreur: "Le pourcentage fixe doit être entre 0 et 100." };
  return { valeurs: { nom, type_proportion, proportion_fixe } };
}

export async function ajouterCategorie(_prev: EtatAction, formData: FormData): Promise<EtatAction> {
  const { supabase } = await getSession();
  const v = lireCategorie(formData);
  if ("erreur" in v) return { erreur: v.erreur };
  const { data: max } = await supabase.from("categories").select("ordre").order("ordre", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("categories").insert({ ...v.valeurs, ordre: (max?.ordre ?? 0) + 1, actif: true });
  if (error) return { erreur: error.message };
  revalider();
  return { succes: "Catégorie ajoutée." };
}

export async function modifierCategorie(id: string, _prev: EtatAction, formData: FormData): Promise<EtatAction> {
  const { supabase } = await getSession();
  const v = lireCategorie(formData);
  if ("erreur" in v) return { erreur: v.erreur };
  const { error } = await supabase.from("categories").update(v.valeurs).eq("id", id);
  if (error) return { erreur: error.message };
  revalider();
  return { succes: "Catégorie modifiée." };
}

export async function basculerCategorie(id: string, actif: boolean): Promise<EtatAction> {
  const { supabase } = await getSession();
  const { error } = await supabase.from("categories").update({ actif }).eq("id", id);
  if (error) return { erreur: error.message };
  revalider();
  return null;
}

export async function reordonnerCategories(ids: string[]): Promise<EtatAction> {
  const { supabase } = await getSession();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from("categories").update({ ordre: i + 1 }).eq("id", ids[i]);
    if (error) return { erreur: error.message };
  }
  revalider();
  return null;
}

// ------------------------------------------------------------ Prorata annuel

export async function enregistrerRegle(_prev: EtatAction, formData: FormData): Promise<EtatAction> {
  const { supabase } = await getSession();
  const annee = Number(formData.get("annee"));
  const martin = Number(String(formData.get("proportion_martin") ?? "").replace(",", "."));
  const dominique = Math.round((100 - martin) * 100) / 100;
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) return { erreur: "Année invalide." };
  if (!Number.isFinite(martin) || martin < 0 || martin > 100) return { erreur: "La proportion doit être entre 0 et 100." };

  const { error } = await supabase
    .from("regles_remboursement")
    .upsert({ annee, proportion_martin: martin, proportion_dominique: dominique }, { onConflict: "annee" });
  if (error) return { erreur: error.message };
  revalider();
  return { succes: `Prorata ${annee} enregistré.` };
}

export async function supprimerRegle(id: string): Promise<EtatAction> {
  const { supabase } = await getSession();
  const { error } = await supabase.from("regles_remboursement").delete().eq("id", id);
  if (error) return { erreur: error.message };
  revalider();
  return null;
}

// ------------------------------------------------------------------- Profil

export async function modifierProfil(_prev: EtatAction, formData: FormData): Promise<EtatAction> {
  const { supabase, moi } = await getSession();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erreur: "Courriel invalide." };
  if (!nom) return { erreur: "Le nom est requis." };
  const { error } = await supabase.from("profiles").update({ email, nom }).eq("id", moi.id);
  if (error) return { erreur: error.message };
  revalider();
  return { succes: "Profil enregistré." };
}

// --------------------------------------------------------------- Paramètres

export async function modifierParametres(_prev: EtatAction, formData: FormData): Promise<EtatAction> {
  const { supabase } = await getSession();
  const delai = Number(formData.get("delai_relance_jours"));
  if (!Number.isInteger(delai) || delai < 1 || delai > 365) return { erreur: "Le délai doit être entre 1 et 365 jours." };
  const { error } = await supabase.from("parametres").update({ delai_relance_jours: delai, modifie_le: new Date().toISOString() }).eq("id", 1);
  if (error) return { erreur: error.message };
  revalider();
  return { succes: "Paramètres enregistrés." };
}
