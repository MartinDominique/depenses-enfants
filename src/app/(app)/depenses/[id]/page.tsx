import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDepense, getRelances, getSession, urlRecuSignee } from "@/lib/data";
import { montantDu } from "@/lib/calculs";
import { formatDateHeure, formatDateLongue, formatMontant } from "@/lib/format";
import { ActionsDepense } from "@/components/ActionsDepense";
import { PreuvePaiement } from "@/components/PreuvePaiement";
import { BadgeCategorie, BadgeStatut } from "@/components/ui";

export const metadata: Metadata = { title: "Détail de la dépense" };

function Ligne({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-muted">{k}</dt>
      <dd className="text-right text-sm font-medium">{v}</dd>
    </div>
  );
}

export default async function PageDepense({ params }: PageProps<"/depenses/[id]">) {
  const { id } = await params;
  const [{ moi, profils }, d] = await Promise.all([getSession(), getDepense(id)]);
  if (!d) notFound();
  const [urlRecu, urlPreuve, relances] = await Promise.all([urlRecuSignee(d.photo_recu_url), urlRecuSignee(d.preuve_paiement_url), getRelances(d.id)]);

  const nom = (pid: string | null | undefined) => profils.find((p) => p.id === pid)?.nom ?? "—";
  const payeur = nom(d.payeur_id);
  const debiteur = profils.find((p) => p.id !== d.payeur_id)?.nom ?? "l'autre parent";
  const du = montantDu(d);
  const jeSuisCrediteur = d.payeur_id === moi.id;
  const estPdf = d.photo_recu_url?.toLowerCase().endsWith(".pdf");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} /> Retour
      </Link>

      <div className="carte overflow-hidden">
        <div className="border-b border-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{formatDateLongue(d.date)}</p>
              <h1 className="mt-0.5 text-xl font-bold">{d.description}</h1>
            </div>
            <BadgeStatut statut={d.statut} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <BadgeCategorie categorie={d.categorie} />
            <span className="text-xs text-muted">Pour : {d.beneficiaire}</span>
          </div>
        </div>

        <div className={`p-5 ${jeSuisCrediteur ? "bg-success/10" : "bg-danger/10"}`}>
          <p className="text-sm text-muted">
            {d.statut === "paye" ? "Remboursé" : "À rembourser"} par {debiteur} à {payeur}
          </p>
          <p className={`text-3xl font-bold ${jeSuisCrediteur ? "text-success" : "text-danger"}`}>{formatMontant(du)}</p>
          <p className="text-xs text-muted">
            {Number(d.proportion_remboursement)} % de {formatMontant(d.montant_total)}
          </p>
        </div>

        {d.statut === "conteste" && d.contestation_commentaire && (
          <div className="border-t border-border bg-red-50 p-5 dark:bg-red-950/30">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Contestée par {debiteur}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{d.contestation_commentaire}</p>
          </div>
        )}

        <dl className="divide-y divide-border border-t border-border px-5">
          <Ligne k="Montant total" v={formatMontant(d.montant_total)} />
          <Ligne k="Payé par" v={payeur} />
          {d.methode_paiement && <Ligne k="Méthode de paiement" v={d.methode_paiement} />}
          {d.notes && <Ligne k="Notes" v={<span className="whitespace-pre-wrap">{d.notes}</span>} />}
          {d.statut === "paye" && d.paye_le && <Ligne k="Réglé le" v={`${formatDateHeure(d.paye_le)}${d.paye_par_id ? ` par ${nom(d.paye_par_id)}` : ""}`} />}
          <Ligne k="Ajouté par" v={`${nom(d.cree_par_id)} · ${formatDateHeure(d.cree_le)}`} />
          {relances.length > 0 && <Ligne k="Rappels envoyés" v={relances.map((r) => formatDateHeure(r.envoye_le)).join(", ")} />}
        </dl>

        {urlRecu && (
          <div className="border-t border-border p-5">
            <p className="mb-2 text-sm font-medium text-muted">Reçu</p>
            {estPdf ? (
              <a href={urlRecu} target="_blank" rel="noreferrer" className="btn-secondaire">Ouvrir le reçu (PDF)</a>
            ) : (
              <a href={urlRecu} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlRecu} alt="Photo du reçu" className="max-h-[70vh] w-full rounded-lg border border-border object-contain" />
              </a>
            )}
          </div>
        )}

        {d.statut !== "archive" && (
          <div className="border-t border-border p-5">
            <PreuvePaiement depenseId={d.id} userId={moi.id} chemin={d.preuve_paiement_url} url={urlPreuve} peutModifier />
          </div>
        )}

        <div className="border-t border-border p-5">
          <ActionsDepense d={d} moi={moi} />
        </div>
      </div>
    </div>
  );
}
