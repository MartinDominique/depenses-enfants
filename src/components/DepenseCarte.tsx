import Link from "next/link";
import { Camera } from "lucide-react";
import { montantDu } from "@/lib/calculs";
import { formatDateCourte, formatMontant } from "@/lib/format";
import type { Depense, Profil } from "@/lib/types";
import { BadgeCategorie, BadgeStatut } from "./ui";
import { CheckboxPaye } from "./CheckboxPaye";

export function DepenseCarte({ d, moi, profils }: { d: Depense; moi: Profil; profils: Profil[] }) {
  const du = montantDu(d);
  const jeSuisCrediteur = d.payeur_id === moi.id;
  const payeur = profils.find((p) => p.id === d.payeur_id);
  const debiteur = profils.find((p) => p.id !== d.payeur_id);
  const peutCocher = jeSuisCrediteur && (d.statut === "non_paye" || d.statut === "paye");

  let quiDoit: string;
  if (du === 0) quiDoit = "Aucun remboursement";
  else if (d.statut === "paye") quiDoit = jeSuisCrediteur ? `${debiteur?.nom ?? "L'autre"} t'a remboursé` : `Tu as remboursé ${payeur?.nom ?? ""}`;
  else quiDoit = jeSuisCrediteur ? `${debiteur?.nom ?? "L'autre"} te doit` : `Tu dois à ${payeur?.nom ?? ""}`;

  return (
    <div className="carte flex items-stretch">
      <Link href={`/depenses/${d.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-3 transition hover:bg-background/60">
        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-background py-1.5 text-center leading-tight">
          <span className="text-[11px] uppercase text-muted">{formatDateCourte(d.date).split(" ")[1]?.replace(".", "")}</span>
          <span className="text-lg font-bold">{formatDateCourte(d.date).split(" ")[0]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium">{d.description}</p>
            {d.photo_recu_url && <Camera size={14} className="shrink-0 text-muted" aria-label="Reçu joint" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <BadgeCategorie categorie={d.categorie} />
            <span className="text-xs text-muted">{d.beneficiaire}</span>
            {d.statut !== "non_paye" && <BadgeStatut statut={d.statut} />}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-bold ${jeSuisCrediteur ? "text-success" : "text-danger"}`}>
            {jeSuisCrediteur ? "+" : "−"}
            {formatMontant(du)}
          </p>
          <p className="text-[11px] text-muted">{quiDoit}</p>
          <p className="text-[11px] text-muted">
            {formatMontant(d.montant_total)} · {Number(d.proportion_remboursement)} %
          </p>
        </div>
      </Link>
      {peutCocher && (
        <div className="flex items-center border-l border-border px-3">
          <CheckboxPaye id={d.id} paye={d.statut === "paye"} />
        </div>
      )}
    </div>
  );
}
