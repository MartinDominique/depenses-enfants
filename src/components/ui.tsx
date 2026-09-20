import type { EtatAction } from "@/lib/actions/etat";
import { STATUT_LIBELLE, type Statut } from "@/lib/types";
import { couleurCategorie } from "@/lib/calculs";

export function Message({ etat }: { etat: EtatAction }) {
  if (!etat?.erreur && !etat?.succes) return null;
  return (
    <p
      role={etat.erreur ? "alert" : "status"}
      className={
        etat.erreur
          ? "rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          : "rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
      }
    >
      {etat.erreur ?? etat.succes}
    </p>
  );
}

const STATUT_CLASSES: Record<Statut, string> = {
  non_paye: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  paye: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  conteste: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  archive: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200",
};

export function BadgeStatut({ statut }: { statut: Statut }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUT_CLASSES[statut]}`}>
      {STATUT_LIBELLE[statut]}
    </span>
  );
}

export function BadgeCategorie({ categorie }: { categorie: { nom: string; ordre: number } | null | undefined }) {
  return (
    <span className={`inline-block truncate rounded-full px-2 py-0.5 text-xs font-medium ${couleurCategorie(categorie)}`}>
      {categorie?.nom ?? "Sans catégorie"}
    </span>
  );
}

export function TitrePage({ titre, sousTitre, action }: { titre: string; sousTitre?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{titre}</h1>
        {sousTitre && <p className="mt-0.5 text-sm text-muted">{sousTitre}</p>}
      </div>
      {action}
    </div>
  );
}

export function Vide({ titre, texte }: { titre: string; texte?: string }) {
  return (
    <div className="carte px-6 py-12 text-center">
      <p className="font-medium">{titre}</p>
      {texte && <p className="mt-1 text-sm text-muted">{texte}</p>}
    </div>
  );
}
