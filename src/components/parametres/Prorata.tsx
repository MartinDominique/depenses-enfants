"use client";

import { useActionState, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { enregistrerRegle, supprimerRegle } from "@/lib/actions/parametres";
import type { RegleRemboursement } from "@/lib/types";
import { Message } from "../ui";

export function Prorata({ regles }: { regles: RegleRemboursement[] }) {
  const [etat, action, enCours] = useActionState(enregistrerRegle, null);
  const [enCoursSuppr, startTransition] = useTransition();
  const prochaineAnnee = regles.length ? Math.max(...regles.map((r) => r.annee)) + 1 : new Date().getFullYear();
  const [martin, setMartin] = useState(regles[0]?.proportion_martin ?? 50);

  return (
    <section className="carte">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">Prorata annuel</h2>
        <p className="text-xs text-muted">Utilisé par les catégories « prorata » (garde, médical, dentaire…). Part de chacun selon les revenus.</p>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Année</th>
            <th className="px-2 py-2 font-medium">Martin</th>
            <th className="px-2 py-2 font-medium">Dominique</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {regles.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2 font-medium">{r.annee}</td>
              <td className="px-2 py-2">{Number(r.proportion_martin)} %</td>
              <td className="px-2 py-2">{Number(r.proportion_dominique)} %</td>
              <td className="py-2 pr-2 text-right">
                <button
                  type="button"
                  disabled={enCoursSuppr}
                  onClick={() => {
                    if (confirm(`Supprimer la règle ${r.annee} ?`)) startTransition(async () => { await supprimerRegle(r.id); });
                  }}
                  className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-danger"
                  aria-label={`Supprimer ${r.annee}`}
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
          {regles.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-3 text-center text-muted">Aucune règle. Les catégories prorata utiliseront 50 % par défaut.</td>
            </tr>
          )}
        </tbody>
      </table>
      <form action={action} className="space-y-2 border-t border-border p-4">
        <div className="grid grid-cols-[auto_1fr_1fr] items-end gap-2">
          <div>
            <label className="etiquette" htmlFor="annee">Année</label>
            <input id="annee" name="annee" type="number" min={2000} max={2100} defaultValue={prochaineAnnee} required className="champ w-24 py-2" />
          </div>
          <div>
            <label className="etiquette" htmlFor="proportion_martin">Martin %</label>
            <input
              id="proportion_martin"
              name="proportion_martin"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={martin}
              onChange={(e) => setMartin(Number(e.target.value))}
              required
              className="champ py-2"
            />
          </div>
          <div>
            <label className="etiquette">Dominique %</label>
            <input value={Math.round((100 - martin) * 100) / 100} readOnly className="champ py-2 opacity-70" tabIndex={-1} />
          </div>
        </div>
        <Message etat={etat} />
        <div className="flex justify-end">
          <button type="submit" disabled={enCours} className="btn-primaire py-1.5 text-xs">Enregistrer l&apos;année</button>
        </div>
      </form>
    </section>
  );
}
