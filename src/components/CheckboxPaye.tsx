"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { changerStatutPaye } from "@/lib/actions/depenses";

/** Case « marquer payé » — affichée seulement au créditeur. */
export function CheckboxPaye({ id, paye, taille = "md" }: { id: string; paye: boolean; taille?: "md" | "lg" }) {
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [optimiste, setOptimiste] = useState(paye);

  function basculer() {
    const nouveau = !optimiste;
    setOptimiste(nouveau);
    setErreur(null);
    startTransition(async () => {
      const r = await changerStatutPaye(id, nouveau);
      if (r?.erreur) {
        setOptimiste(!nouveau);
        setErreur(r.erreur);
      }
    });
  }

  const dim = taille === "lg" ? "h-8 w-8" : "h-7 w-7";
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        role="checkbox"
        aria-checked={optimiste}
        aria-label={optimiste ? "Marquer non payé" : "Marquer payé"}
        title={optimiste ? "Marquer non payé" : "Marquer payé"}
        disabled={enCours}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          basculer();
        }}
        className={`flex ${dim} shrink-0 items-center justify-center rounded-lg border-2 transition ${
          optimiste ? "border-success bg-success text-white" : "border-border bg-surface text-transparent hover:border-success"
        }`}
      >
        {enCours ? <Loader2 size={16} className="animate-spin text-current" /> : <Check size={18} strokeWidth={3} />}
      </button>
      {erreur && <span className="mt-1 max-w-32 text-center text-[10px] text-danger">{erreur}</span>}
    </div>
  );
}
