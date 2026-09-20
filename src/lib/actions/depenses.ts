"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, SELECT_DEPENSE } from "@/lib/data";
import {
  emailDepenseContestee,
  emailDepenseModifiee,
  emailDepensePayee,
  emailNouvelleDepense,
  emailReglementMensuel,
} from "@/lib/email";
import { BENEFICIAIRES, type Beneficiaire, type Depense } from "@/lib/types";
import { formatMois } from "@/lib/format";
import { montantPourMoi } from "@/lib/calculs";
import type { EtatAction } from "./etat";

function revalider() {
  revalidatePath("/", "layout");
}

function lireChamps(formData: FormData) {
  const champs: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") champs[k] = v;
  return champs;
}

function validerDepense(formData: FormData) {
  const date = String(formData.get("date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const montant = Number(String(formData.get("montant_total") ?? "").replace(",", "."));
  const beneficiaire = String(formData.get("beneficiaire") ?? "") as Beneficiaire;
  const categorie_id = String(formData.get("categorie_id") ?? "") || null;
  const proportion = Number(String(formData.get("proportion_remboursement") ?? "").replace(",", "."));
  const methode_paiement = String(formData.get("methode_paiement") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const photo_recu_url = String(formData.get("photo_recu_url") ?? "").trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { erreur: "Date invalide." };
  if (!description) return { erreur: "La description est requise." };
  if (!Number.isFinite(montant) || montant <= 0) return { erreur: "Le montant doit être supérieur à 0." };
  if (!BENEFICIAIRES.includes(beneficiaire)) return { erreur: "Bénéficiaire invalide." };
  if (!Number.isFinite(proportion) || proportion < 0 || proportion > 100)
    return { erreur: "La proportion doit être entre 0 et 100 %." };

  return {
    valeurs: {
      date,
      description,
      montant_total: Math.round(montant * 100) / 100,
      beneficiaire,
      categorie_id,
      proportion_remboursement: proportion,
      methode_paiement,
      notes,
      photo_recu_url,
    },
  };
}

export async function creerDepense(_prev: EtatAction, formData: FormData): Promise<EtatAction> {
  const { supabase, moi, autre } = await getSession();
  const v = validerDepense(formData);
  if ("erreur" in v) return { erreur: v.erreur, champs: lireChamps(formData) };

  const dejaPaye = formData.get("deja_paye") === "on";

  const { data, error } = await supabase
    .from("depenses")
    .insert({
      ...v.valeurs,
      payeur_id: moi.id,
      cree_par_id: moi.id,
      statut: dejaPaye ? "paye" : "non_paye",
    })
    .select(SELECT_DEPENSE)
    .single();

  if (error || !data) return { erreur: `Enregistrement impossible : ${error?.message}`, champs: lireChamps(formData) };

  if (autre) await emailNouvelleDepense(data as Depense, moi, autre);
  revalider();
  redirect("/?ajout=1");
}

export async function modifierDepense(id: string, _prev: EtatAction, formData: FormData): Promise<EtatAction> {
  const { supabase, moi, autre } = await getSession();
  const v = validerDepense(formData);
  if ("erreur" in v) return { erreur: v.erreur, champs: lireChamps(formData) };

  const { data: avant } = await supabase.from("depenses").select("statut, cree_par_id").eq("id", id).single();
  if (!avant) return { erreur: "Dépense introuvable." };
  if (avant.cree_par_id !== moi.id) return { erreur: "Seul le créateur peut modifier cette dépense." };
  if (!["non_paye", "conteste"].includes(avant.statut)) return { erreur: "Une dépense réglée ne peut plus être modifiée." };

  const { data, error } = await supabase
    .from("depenses")
    .update({ ...v.valeurs, statut: "non_paye" }) // une dépense contestée corrigée repasse en cours
    .eq("id", id)
    .select(SELECT_DEPENSE)
    .single();
  if (error || !data) return { erreur: `Modification impossible : ${error?.message}`, champs: lireChamps(formData) };

  if (autre) await emailDepenseModifiee(data as Depense, moi, autre);
  revalider();
  redirect(`/depenses/${id}`);
}

export async function changerStatutPaye(id: string, paye: boolean): Promise<EtatAction> {
  const { supabase, moi, autre } = await getSession();
  const { data, error } = await supabase
    .from("depenses")
    .update(paye ? { statut: "paye", paye_par_id: autre?.id ?? null } : { statut: "non_paye" })
    .eq("id", id)
    .select(SELECT_DEPENSE)
    .single();
  if (error || !data) return { erreur: error?.message ?? "Modification impossible." };

  if (paye && autre) await emailDepensePayee(data as Depense, moi, autre);
  revalider();
  return { succes: paye ? "Dépense marquée payée." : "Dépense remise en cours." };
}

export async function contesterDepense(id: string, _prev: EtatAction, formData: FormData): Promise<EtatAction> {
  const { supabase, moi, profils } = await getSession();
  const commentaire = String(formData.get("commentaire") ?? "").trim();
  if (!commentaire) return { erreur: "Un commentaire est requis pour contester." };

  const { data, error } = await supabase
    .from("depenses")
    .update({ statut: "conteste", contestation_commentaire: commentaire })
    .eq("id", id)
    .select(SELECT_DEPENSE)
    .single();
  if (error || !data) return { erreur: error?.message ?? "Contestation impossible." };

  const d = data as Depense;
  const payeur = profils.find((p) => p.id === d.payeur_id);
  if (payeur) await emailDepenseContestee(d, payeur, moi);
  revalider();
  return { succes: "Dépense contestée. L'autre parent a été avisé." };
}

export async function archiverDepense(id: string, archiver = true): Promise<EtatAction> {
  const { supabase } = await getSession();
  const { error } = await supabase
    .from("depenses")
    .update({ statut: archiver ? "archive" : "non_paye" })
    .eq("id", id);
  if (error) return { erreur: error.message };
  revalider();
  return { succes: archiver ? "Dépense archivée." : "Dépense remise en cours." };
}

export async function confirmerReglementMois(annee: number, mois: number): Promise<EtatAction> {
  const { supabase, moi, autre } = await getSession();

  // net avant règlement, pour le courriel
  const debut = `${annee}-${String(mois).padStart(2, "0")}-01`;
  const fin = new Date(Date.UTC(annee, mois, 1)).toISOString().slice(0, 10);
  const { data: liste } = await supabase
    .from("depenses")
    .select("montant_total, proportion_remboursement, payeur_id")
    .eq("statut", "non_paye")
    .gte("date", debut)
    .lt("date", fin);
  const net = (liste ?? []).reduce((s, d) => s + montantPourMoi(d, moi.id), 0);

  const { data: nb, error } = await supabase.rpc("confirmer_reglement_mois", { p_annee: annee, p_mois: mois });
  if (error) return { erreur: error.message };

  if (autre && Number(nb) > 0) await emailReglementMensuel(formatMois(annee, mois), Number(nb), net, moi, autre);
  revalider();
  return { succes: `${nb} dépense${Number(nb) > 1 ? "s" : ""} marquée${Number(nb) > 1 ? "s" : ""} payée${Number(nb) > 1 ? "s" : ""}.` };
}
