import type { Metadata } from "next";
import { getAnneesDisponibles, getCategories, getSession } from "@/lib/data";
import { FormulaireExport } from "@/components/FormulaireExport";
import { TitrePage } from "@/components/ui";

export const metadata: Metadata = { title: "Export" };

export default async function PageExport() {
  const [{ profils }, annees, categories] = await Promise.all([getSession(), getAnneesDisponibles(), getCategories()]);
  return (
    <div className="mx-auto max-w-2xl">
      <TitrePage titre="Exporter" sousTitre="CSV ou PDF par année, pour les impôts ou les archives" />
      <FormulaireExport annees={annees} categories={categories} profils={profils} />
    </div>
  );
}
