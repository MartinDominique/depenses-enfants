import type { Categorie, Depense, Profil, RegleRemboursement } from "./types";

/** Montant dû par l'autre parent pour une dépense, arrondi au cent. */
export function montantDu(d: Pick<Depense, "montant_total" | "proportion_remboursement">) {
  return Math.round(Number(d.montant_total) * Number(d.proportion_remboursement)) / 100;
}

/** Pour le profil courant : positif si on me doit, négatif si je dois. */
export function montantPourMoi(d: Pick<Depense, "montant_total" | "proportion_remboursement" | "payeur_id">, moiId: string) {
  const du = montantDu(d);
  return d.payeur_id === moiId ? du : -du;
}

/** Solde net (dépenses non payées seulement). Positif = on me doit. */
export function soldeNet(depenses: Depense[], moiId: string) {
  return depenses
    .filter((d) => d.statut === "non_paye")
    .reduce((s, d) => s + montantPourMoi(d, moiId), 0);
}

export function estMartin(p: Pick<Profil, "nom">) {
  return p.nom.trim().toLowerCase().startsWith("martin");
}

/**
 * Proportion de remboursement pré-remplie pour une catégorie, une date et un payeur.
 * - fixe   → proportion de la catégorie
 * - prorata → part de l'autre parent selon la règle annuelle
 */
export function proportionSuggeree(
  categorie: Categorie | undefined,
  dateISO: string,
  payeur: Profil,
  regles: RegleRemboursement[],
): { proportion: number; source: string } {
  if (!categorie) return { proportion: 50, source: "Défaut 50 %" };
  if (categorie.type_proportion === "fixe") {
    return { proportion: Number(categorie.proportion_fixe ?? 50), source: `Catégorie « ${categorie.nom} » : ${categorie.proportion_fixe} % fixe` };
  }
  const annee = Number(dateISO.slice(0, 4));
  const regle = regles.find((r) => r.annee === annee) ?? [...regles].sort((a, b) => b.annee - a.annee).find((r) => r.annee < annee);
  if (!regle) return { proportion: 50, source: `Aucun prorata défini pour ${annee} : 50 % par défaut` };
  const partAutre = estMartin(payeur) ? Number(regle.proportion_dominique) : Number(regle.proportion_martin);
  const note = regle.annee !== annee ? ` (règle ${regle.annee}, aucune pour ${annee})` : "";
  return { proportion: partAutre, source: `Prorata ${regle.annee} : Martin ${regle.proportion_martin} % / Dominique ${regle.proportion_dominique} %${note}` };
}

export function autreProfil(profils: Profil[], moiId: string) {
  return profils.find((p) => p.id !== moiId);
}

/** Couleur de badge pour une catégorie (stable par ordre). */
const PALETTE = [
  "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200",
];

export function couleurCategorie(cat: { ordre: number } | null | undefined) {
  if (!cat) return "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200";
  return PALETTE[Math.abs(cat.ordre) % PALETTE.length];
}
