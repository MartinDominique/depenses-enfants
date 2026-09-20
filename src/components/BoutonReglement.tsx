"use client";

import { useState, useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { confirmerReglementMois } from "@/lib/actions/depenses";
import type { EtatAction } from "@/lib/actions/etat";
import { Message } from "./ui";

export function BoutonReglement({ annee, mois, nb, libelle }: { annee: number; mois: number; nb: number; libelle: string }) {
  const [enCours, startTransition] = useTransition();
  const [etat, setEtat] = useState<EtatAction>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={enCours || nb === 0}
        onClick={() => {
          if (!confirm(`Marquer les ${nb} dépenses de ${libelle} comme payées ?`)) return;
          startTransition(async () => setEtat(await confirmerReglementMois(annee, mois)));
        }}
        className="btn-primaire w-full py-3 text-base"
      >
        <CheckCheck size={20} />
        {enCours ? "Confirmation…" : "Confirmer le règlement du mois"}
      </button>
      <Message etat={etat} />
    </div>
  );
}
