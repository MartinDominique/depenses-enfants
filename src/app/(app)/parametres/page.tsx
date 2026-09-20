import type { Metadata } from "next";
import { getCategories, getParametres, getRegles, getSession } from "@/lib/data";
import { Categories } from "@/components/parametres/Categories";
import { Prorata } from "@/components/parametres/Prorata";
import { ProfilForm, RelancesForm } from "@/components/parametres/ProfilEtRelances";
import { TitrePage } from "@/components/ui";

export const metadata: Metadata = { title: "Réglages" };

export default async function PageParametres() {
  const [{ moi, user, profils }, categories, regles, parametres] = await Promise.all([getSession(), getCategories(), getRegles(), getParametres()]);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <TitrePage titre="Réglages" />
      <Categories categories={categories} />
      <Prorata regles={regles} profils={profils} />
      <RelancesForm parametres={parametres} />
      <ProfilForm moi={moi} emailConnexion={user.email ?? ""} />
    </div>
  );
}
