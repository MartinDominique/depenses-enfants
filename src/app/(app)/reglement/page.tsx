import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDepenses, getSession } from "@/lib/data";
import { montantDu, montantPourMoi } from "@/lib/calculs";
import { formatMois, formatMontant, moisCourant } from "@/lib/format";
import { BoutonReglement } from "@/components/BoutonReglement";
import { ListeDepenses } from "@/components/ListeDepenses";
import { TitrePage } from "@/components/ui";

export const metadata: Metadata = { title: "Règlement mensuel" };

export default async function PageReglement({ searchParams }: PageProps<"/reglement">) {
  const sp = await searchParams;
  const courant = moisCourant();
  const m = typeof sp.mois === "string" && /^\d{4}-\d{2}$/.test(sp.mois) ? sp.mois : `${courant.annee}-${String(courant.mois).padStart(2, "0")}`;
  const [annee, mois] = m.split("-").map(Number);

  const { moi, autre, profils } = await getSession();
  const depenses = await getDepenses({ statuts: ["non_paye"], mois: m });
  const contestees = await getDepenses({ statuts: ["conteste"], mois: m });

  const onMeDoit = depenses.filter((d) => d.payeur_id === moi.id).reduce((s, d) => s + montantDu(d), 0);
  const jeDois = depenses.filter((d) => d.payeur_id !== moi.id).reduce((s, d) => s + montantDu(d), 0);
  const net = depenses.reduce((s, d) => s + montantPourMoi(d, moi.id), 0);
  const peutConfirmer = net >= 0 && depenses.length > 0;

  const prec = new Date(annee, mois - 2, 1);
  const suiv = new Date(annee, mois, 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const libelle = formatMois(annee, mois);

  return (
    <div className="mx-auto max-w-2xl">
      <TitrePage titre="Règlement mensuel" sousTitre="Solde net du mois et règlement en un clic" />

      <div className="mb-4 flex items-center justify-between">
        <Link href={`/reglement?mois=${iso(prec)}`} className="btn-secondaire px-3" aria-label="Mois précédent"><ChevronLeft size={18} /></Link>
        <h2 className="text-lg font-semibold">{libelle}</h2>
        <Link href={`/reglement?mois=${iso(suiv)}`} className="btn-secondaire px-3" aria-label="Mois suivant"><ChevronRight size={18} /></Link>
      </div>

      <div className="carte mb-4 p-5">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-muted">{autre?.nom ?? "L'autre"} te doit</p>
            <p className="text-xl font-bold text-success">{formatMontant(onMeDoit)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Tu dois à {autre?.nom ?? "l'autre"}</p>
            <p className="text-xl font-bold text-danger">{formatMontant(jeDois)}</p>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-4 text-center">
          <p className="text-sm text-muted">Net du mois</p>
          <p className="text-3xl font-bold">
            {Math.abs(net) < 0.005
              ? "À jour"
              : net > 0
                ? `${autre?.nom ?? "L'autre"} te doit ${formatMontant(net)}`
                : `Tu dois ${formatMontant(-net)} à ${autre?.nom ?? "l'autre"}`}
          </p>
          <p className="mt-1 text-xs text-muted">{depenses.length} dépense{depenses.length > 1 ? "s" : ""} non payée{depenses.length > 1 ? "s" : ""}</p>
        </div>
        <div className="mt-4">
          {peutConfirmer ? (
            <BoutonReglement annee={annee} mois={mois} nb={depenses.length} libelle={libelle} userId={moi.id} />
          ) : depenses.length === 0 ? (
            <p className="text-center text-sm text-muted">Rien à régler pour ce mois.</p>
          ) : (
            <p className="rounded-lg bg-background px-3 py-2 text-center text-sm text-muted">
              C&apos;est {autre?.nom ?? "l'autre parent"} qui confirme le règlement une fois ton virement reçu.
            </p>
          )}
        </div>
        {contestees.length > 0 && (
          <p className="mt-3 text-center text-xs text-warning">
            {contestees.length} dépense{contestees.length > 1 ? "s" : ""} contestée{contestees.length > 1 ? "s" : ""} exclue{contestees.length > 1 ? "s" : ""} du règlement.
          </p>
        )}
      </div>

      <ListeDepenses depenses={[...depenses, ...contestees]} moi={moi} profils={profils} vide="Aucune dépense en attente pour ce mois." />
    </div>
  );
}
