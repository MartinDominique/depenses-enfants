import { getCategories, getDepenses, getDepensesEnCours, getSession } from "@/lib/data";
import { soldeNet } from "@/lib/calculs";
import { BandeauSolde } from "@/components/BandeauSolde";
import { Filtres } from "@/components/Filtres";
import { ListeDepenses } from "@/components/ListeDepenses";
import type { Statut } from "@/lib/types";
import { Suspense } from "react";

const OPTIONS_STATUT = [
  { valeur: "", libelle: "En cours" },
  { valeur: "non_paye", libelle: "Non payé" },
  { valeur: "conteste", libelle: "Contesté" },
  { valeur: "paye", libelle: "Payé" },
  { valeur: "archive", libelle: "Archivé" },
  { valeur: "tous", libelle: "Tous" },
];

function param(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export default async function PageAccueil({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const { moi, profils, autre } = await getSession();

  const statutParam = param(sp.statut);
  let statuts: Statut[] | undefined;
  if (!statutParam) statuts = ["non_paye", "conteste"];
  else if (statutParam === "tous") statuts = undefined;
  else statuts = [statutParam as Statut];

  const [categories, depenses, enCours, toutes] = await Promise.all([
    getCategories(),
    getDepenses({ statuts, mois: param(sp.mois), categorie: param(sp.categorie), q: param(sp.q) }),
    getDepensesEnCours(),
    getDepenses({ statuts: undefined }).then((l) => l.map((d) => d.date.slice(0, 7))),
  ]);

  const net = soldeNet(enCours, moi.id);
  const nbContestees = depenses.filter((d) => d.statut === "conteste").length;
  const mois = [...new Set(toutes)].sort().reverse();

  return (
    <>
      <BandeauSolde net={net} autre={autre} nbEnCours={enCours.length} nbContestees={statutParam ? 0 : nbContestees} />
      <Suspense>
        <Filtres categories={categories} optionsStatut={OPTIONS_STATUT} mois={mois} />
      </Suspense>
      <ListeDepenses depenses={depenses} moi={moi} profils={profils} vide="Aucune dépense ne correspond à ces filtres." />
    </>
  );
}
