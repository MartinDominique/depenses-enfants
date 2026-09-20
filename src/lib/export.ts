import { montantDu } from "./calculs";
import { STATUT_LIBELLE, type Depense, type Profil } from "./types";

export type LigneExport = {
  date: string;
  description: string;
  categorie: string;
  beneficiaire: string;
  payeur: string;
  montant_total: number;
  proportion: number;
  montant_du: number;
  debiteur: string;
  statut: string;
  paye_le: string;
  methode_paiement: string;
  notes: string;
};

export function lignesExport(depenses: Depense[], profils: Profil[]): LigneExport[] {
  const nom = (id: string | null) => profils.find((p) => p.id === id)?.nom ?? "";
  return depenses.map((d) => ({
    date: d.date,
    description: d.description,
    categorie: d.categorie?.nom ?? "",
    beneficiaire: d.beneficiaire,
    payeur: nom(d.payeur_id),
    montant_total: Number(d.montant_total),
    proportion: Number(d.proportion_remboursement),
    montant_du: montantDu(d),
    debiteur: profils.find((p) => p.id !== d.payeur_id)?.nom ?? "",
    statut: STATUT_LIBELLE[d.statut],
    paye_le: d.paye_le ? d.paye_le.slice(0, 10) : "",
    methode_paiement: d.methode_paiement ?? "",
    notes: d.notes ?? "",
  }));
}

export const COLONNES_EXPORT: { cle: keyof LigneExport; titre: string }[] = [
  { cle: "date", titre: "Date" },
  { cle: "description", titre: "Description" },
  { cle: "categorie", titre: "Catégorie" },
  { cle: "beneficiaire", titre: "Bénéficiaire" },
  { cle: "payeur", titre: "Payé par" },
  { cle: "montant_total", titre: "Montant total" },
  { cle: "proportion", titre: "% remboursé" },
  { cle: "montant_du", titre: "Montant dû" },
  { cle: "debiteur", titre: "Dû par" },
  { cle: "statut", titre: "Statut" },
  { cle: "paye_le", titre: "Payé le" },
  { cle: "methode_paiement", titre: "Méthode" },
  { cle: "notes", titre: "Notes" },
];

export function versCSV(lignes: LigneExport[]) {
  const sep = ";"; // Excel en français attend le point-virgule
  const cellule = (v: unknown) => {
    const s = typeof v === "number" ? v.toFixed(2).replace(".", ",") : String(v ?? "");
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const entete = COLONNES_EXPORT.map((c) => cellule(c.titre)).join(sep);
  const corps = lignes.map((l) => COLONNES_EXPORT.map((c) => cellule(l[c.cle])).join(sep));
  return "﻿" + [entete, ...corps].join("\r\n");
}
