"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import type { Categorie, Profil } from "@/lib/types";
import { COLONNES_EXPORT, type LigneExport } from "@/lib/export";

export function FormulaireExport({ annees, categories, profils }: { annees: number[]; categories: Categorie[]; profils: Profil[] }) {
  const [annee, setAnnee] = useState(annees[0] ?? new Date().getFullYear());
  const [categorie, setCategorie] = useState("");
  const [statut, setStatut] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const query = new URLSearchParams({ annee: String(annee) });
  if (categorie) query.set("categorie", categorie);
  if (statut) query.set("statut", statut);

  async function genererPDF() {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/export?${query.toString()}&format=json`);
      if (!res.ok) throw new Error("Chargement des données impossible.");
      const { lignes } = (await res.json()) as { lignes: LigneExport[] };

      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
      const fmt = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
      const nomCat = categories.find((c) => c.id === categorie)?.nom;

      doc.setFontSize(16);
      doc.text(`Dépenses enfants — ${annee}${nomCat ? ` — ${nomCat}` : ""}`, 14, 14);
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text(`Généré le ${new Date().toLocaleDateString("fr-CA")} · ${lignes.length} dépense${lignes.length > 1 ? "s" : ""}`, 14, 20);

      const colonnes = COLONNES_EXPORT.filter((c) => !["notes", "methode_paiement"].includes(c.cle));
      autoTable(doc, {
        startY: 24,
        head: [colonnes.map((c) => c.titre)],
        body: lignes.map((l) =>
          colonnes.map((c) => {
            const v = l[c.cle];
            if (c.cle === "montant_total" || c.cle === "montant_du") return fmt(Number(v));
            if (c.cle === "proportion") return `${v} %`;
            return String(v ?? "");
          }),
        ),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [37, 99, 235] },
        columnStyles: { 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
      });

      // Totaux par payeur / catégorie
      const total = lignes.reduce((s, l) => s + l.montant_total, 0);
      const parPayeur = profils.map((p) => ({
        nom: p.nom,
        total: lignes.filter((l) => l.payeur === p.nom).reduce((s, l) => s + l.montant_total, 0),
        du: lignes.filter((l) => l.payeur === p.nom).reduce((s, l) => s + l.montant_du, 0),
      }));
      const parCategorie = [...new Set(lignes.map((l) => l.categorie || "Sans catégorie"))].map((cat) => ({
        cat,
        total: lignes.filter((l) => (l.categorie || "Sans catégorie") === cat).reduce((s, l) => s + l.montant_total, 0),
      }));
      const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      autoTable(doc, {
        startY: y,
        head: [["Résumé", "Montant total", "Montant dû par l'autre"]],
        body: [
          ...parPayeur.map((p) => [`Payé par ${p.nom}`, fmt(p.total), fmt(p.du)]),
          ...parCategorie.map((c) => [c.cat, fmt(c.total), ""]),
          ["Total", fmt(total), ""],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [100, 116, 139] },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
        tableWidth: 120,
      });

      doc.save(`depenses-enfants-${annee}${nomCat ? "-" + nomCat.toLowerCase().replace(/\s+/g, "-") : ""}.pdf`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur lors de la génération du PDF.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="carte space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="etiquette" htmlFor="annee">Année</label>
          <select id="annee" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="champ">
            {annees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiquette" htmlFor="categorie">Catégorie</label>
          <select id="categorie" value={categorie} onChange={(e) => setCategorie(e.target.value)} className="champ">
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiquette" htmlFor="statut">Statut</label>
          <select id="statut" value={statut} onChange={(e) => setStatut(e.target.value)} className="champ">
            <option value="">Tous (sauf archivées)</option>
            <option value="paye">Payées seulement</option>
            <option value="en_cours">En cours seulement</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <a href={`/api/export?${query.toString()}&format=csv`} className="btn-secondaire flex-1" download>
          <FileSpreadsheet size={18} /> Télécharger CSV (Excel)
        </a>
        <button type="button" onClick={genererPDF} disabled={enCours} className="btn-primaire flex-1">
          {enCours ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} Télécharger PDF
        </button>
      </div>
      {erreur && <p className="text-sm text-danger">{erreur}</p>}
      <p className="text-xs text-muted">
        Astuce impôts : filtre par « Frais de garde » ou « Frais médical » pour obtenir le total de l&apos;année par catégorie. Le PDF inclut un résumé
        par payeur et par catégorie.
      </p>
    </div>
  );
}
