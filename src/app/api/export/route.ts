import { NextResponse } from "next/server";
import { getDepenses, getSession } from "@/lib/data";
import { lignesExport, versCSV } from "@/lib/export";
import type { Statut } from "@/lib/types";

export async function GET(request: Request) {
  const { profils } = await getSession();
  const { searchParams } = new URL(request.url);
  const annee = Number(searchParams.get("annee"));
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) {
    return NextResponse.json({ error: "Année invalide" }, { status: 400 });
  }
  const categorie = searchParams.get("categorie") || undefined;
  const statutParam = searchParams.get("statut");
  const statuts: Statut[] | undefined =
    statutParam === "paye" ? ["paye"] : statutParam === "en_cours" ? ["non_paye", "conteste"] : ["non_paye", "paye", "conteste"];
  const format = searchParams.get("format") ?? "csv";

  const depenses = await getDepenses({ annee, categorie, statuts });
  const lignes = lignesExport([...depenses].reverse(), profils); // ordre chronologique

  if (format === "json") {
    return NextResponse.json({ annee, lignes });
  }

  const nomFichier = `depenses-enfants-${annee}${categorie ? "-categorie" : ""}.csv`;
  return new NextResponse(versCSV(lignes), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
