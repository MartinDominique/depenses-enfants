export type Statut = "non_paye" | "paye" | "conteste" | "archive";
export type TypeProportion = "fixe" | "prorata";
export type Beneficiaire = "Eugène" | "Lambert" | "Les 2" | "N/A";

export const BENEFICIAIRES: Beneficiaire[] = ["Eugène", "Lambert", "Les 2", "N/A"];
export const METHODES_PAIEMENT = ["Interac", "Carte de crédit", "Carte de débit", "Cash", "Chèque", "Autre"];

export const STATUT_LIBELLE: Record<Statut, string> = {
  non_paye: "En cours",
  paye: "Payé",
  conteste: "Contesté",
  archive: "Archivé",
};

export type Profil = {
  id: string;
  nom: string;
  email: string;
};

export type Categorie = {
  id: string;
  nom: string;
  type_proportion: TypeProportion;
  proportion_fixe: number | null;
  actif: boolean;
  ordre: number;
};

export type RegleRemboursement = {
  id: string;
  annee: number;
  proportion_martin: number;
  proportion_dominique: number;
};

export type Parametres = {
  id: number;
  delai_relance_jours: number;
};

export type Depense = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  montant_total: number;
  payeur_id: string;
  beneficiaire: Beneficiaire;
  categorie_id: string | null;
  proportion_remboursement: number;
  methode_paiement: string | null;
  notes: string | null;
  photo_recu_url: string | null;
  preuve_paiement_url: string | null;
  statut: Statut;
  contestation_commentaire: string | null;
  paye_par_id: string | null;
  paye_le: string | null;
  cree_par_id: string;
  cree_le: string;
  modifie_le: string;
  categorie?: Pick<Categorie, "id" | "nom" | "ordre"> | null;
};

export type Relance = {
  id: string;
  depense_id: string;
  envoye_le: string;
};
