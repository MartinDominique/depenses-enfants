import type { Metadata } from "next";
import { getCategories, getRegles, getSession } from "@/lib/data";
import { creerDepense } from "@/lib/actions/depenses";
import { aujourdhuiISO } from "@/lib/format";
import { FormulaireDepense } from "@/components/FormulaireDepense";
import { Modale } from "@/components/Modale";

export const metadata: Metadata = { title: "Nouvelle dépense" };

export default async function PageNouvelleDepense() {
  const [{ moi, autre }, categories, regles] = await Promise.all([getSession(), getCategories(true), getRegles()]);
  return (
    <Modale titre="Nouvelle dépense" retour="/">
      <FormulaireDepense action={creerDepense} categories={categories} regles={regles} moi={moi} autre={autre} dateDefaut={aujourdhuiISO()} />
    </Modale>
  );
}
