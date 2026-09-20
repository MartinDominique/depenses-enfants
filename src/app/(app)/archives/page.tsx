import type { Metadata } from "next";
import { Suspense } from "react";
import { getCategories, getDepenses, getSession } from "@/lib/data";
import { Filtres } from "@/components/Filtres";
import { ListeDepenses } from "@/components/ListeDepenses";
import { TitrePage } from "@/components/ui";
import type { Statut } from "@/lib/types";

export const metadata: Metadata = { title: "Archives" };

const OPTIONS_STATUT = [
  { valeur: "", libelle: "Payé + archivé" },
  { valeur: "paye", libelle: "Payé" },
  { valeur: "archive", libelle: "Archivé" },
];

function param(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export default async function PageArchives({ searchParams }: PageProps<"/archives">) {
  const sp = await searchParams;
  const { moi, profils } = await getSession();
  const statutParam = param(sp.statut);
  const statuts: Statut[] = statutParam === "paye" || statutParam === "archive" ? [statutParam] : ["paye", "archive"];

  const [categories, depenses, toutes] = await Promise.all([
    getCategories(),
    getDepenses({ statuts, mois: param(sp.mois), categorie: param(sp.categorie), q: param(sp.q) }),
    getDepenses({ statuts: ["paye", "archive"] }).then((l) => l.map((d) => d.date.slice(0, 7))),
  ]);

  return (
    <>
      <TitrePage titre="Archives" sousTitre="Dépenses réglées ou archivées — rien n'est jamais supprimé" />
      <Suspense>
        <Filtres categories={categories} optionsStatut={OPTIONS_STATUT} mois={[...new Set(toutes)].sort().reverse()} />
      </Suspense>
      <ListeDepenses depenses={depenses} moi={moi} profils={profils} vide="Aucune dépense archivée pour ces filtres." />
    </>
  );
}
