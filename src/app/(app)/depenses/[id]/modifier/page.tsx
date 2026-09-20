import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCategories, getDepense, getRegles, getSession, urlRecuSignee } from "@/lib/data";
import { modifierDepense } from "@/lib/actions/depenses";
import { aujourdhuiISO } from "@/lib/format";
import { FormulaireDepense } from "@/components/FormulaireDepense";
import { Modale } from "@/components/Modale";

export const metadata: Metadata = { title: "Modifier la dépense" };

export default async function PageModifierDepense({ params }: PageProps<"/depenses/[id]/modifier">) {
  const { id } = await params;
  const [{ moi, autre }, depense, categories, regles] = await Promise.all([getSession(), getDepense(id), getCategories(), getRegles()]);
  if (!depense) notFound();
  if (depense.cree_par_id !== moi.id || !["non_paye", "conteste"].includes(depense.statut)) redirect(`/depenses/${id}`);

  const urlRecu = await urlRecuSignee(depense.photo_recu_url);
  const categoriesVisibles = categories.filter((c) => c.actif || c.id === depense.categorie_id);

  return (
    <Modale titre="Modifier la dépense" retour={`/depenses/${id}`}>
      {depense.statut === "conteste" && (
        <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          Cette dépense est contestée. Une fois corrigée, elle repassera « en cours ».
        </p>
      )}
      <FormulaireDepense
        action={modifierDepense.bind(null, id)}
        categories={categoriesVisibles}
        regles={regles}
        moi={moi}
        autre={autre}
        dateDefaut={aujourdhuiISO()}
        depense={depense}
        urlRecu={urlRecu}
      />
    </Modale>
  );
}
