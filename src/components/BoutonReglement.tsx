"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCheck, FileCheck, Loader2, X } from "lucide-react";
import { confirmerReglementMois } from "@/lib/actions/depenses";
import { televerserFichier } from "@/lib/upload-client";
import type { EtatAction } from "@/lib/actions/etat";
import { Message } from "./ui";

export function BoutonReglement({ annee, mois, nb, libelle, userId }: { annee: number; mois: number; nb: number; libelle: string; userId: string }) {
  const [enCours, startTransition] = useTransition();
  const [envoi, setEnvoi] = useState(false);
  const [etat, setEtat] = useState<EtatAction>(null);
  const [preuve, setPreuve] = useState<{ chemin: string; nom: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function joindre(fichier: File) {
    setEnvoi(true);
    setEtat(null);
    try {
      const { chemin } = await televerserFichier(fichier, userId, "preuves");
      setPreuve({ chemin, nom: fichier.name });
    } catch (e) {
      setEtat({ erreur: e instanceof Error ? e.message : "Téléversement impossible." });
    } finally {
      setEnvoi(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm">
        <FileCheck size={16} className="shrink-0 text-muted" />
        {preuve ? (
          <>
            <span className="min-w-0 flex-1 truncate">{preuve.nom}</span>
            <button type="button" onClick={() => setPreuve(null)} className="rounded p-1 text-muted hover:text-danger" aria-label="Retirer la preuve"><X size={16} /></button>
          </>
        ) : (
          <button type="button" disabled={envoi} onClick={() => inputRef.current?.click()} className="flex-1 text-left text-muted hover:text-foreground">
            {envoi ? "Envoi…" : "Joindre une preuve de paiement (optionnel)"}
          </button>
        )}
        {envoi && <Loader2 size={16} className="animate-spin" />}
        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && joindre(e.target.files[0])} />
      </div>
      <button
        type="button"
        disabled={enCours || envoi || nb === 0}
        onClick={() => {
          if (!confirm(`Marquer les ${nb} dépenses de ${libelle} comme payées ?`)) return;
          startTransition(async () => setEtat(await confirmerReglementMois(annee, mois, preuve?.chemin ?? null)));
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
