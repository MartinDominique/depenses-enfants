"use client";

import { useRef, useState, useTransition } from "react";
import { FileCheck, Loader2, Trash2, Upload } from "lucide-react";
import { enregistrerPreuvePaiement } from "@/lib/actions/depenses";
import { televerserFichier } from "@/lib/upload-client";
import type { EtatAction } from "@/lib/actions/etat";
import { Message } from "./ui";

export function PreuvePaiement({ depenseId, userId, chemin, url, peutModifier }: { depenseId: string; userId: string; chemin: string | null; url: string | null; peutModifier: boolean }) {
  const [enCours, startTransition] = useTransition();
  const [envoi, setEnvoi] = useState(false);
  const [etat, setEtat] = useState<EtatAction>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const estPdf = chemin?.toLowerCase().endsWith(".pdf");

  async function envoyer(fichier: File) {
    setEnvoi(true);
    setEtat(null);
    try {
      const { chemin: nouveau } = await televerserFichier(fichier, userId, "preuves");
      startTransition(async () => setEtat(await enregistrerPreuvePaiement(depenseId, nouveau)));
    } catch (e) {
      setEtat({ erreur: e instanceof Error ? e.message : "Téléversement impossible." });
    } finally {
      setEnvoi(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const occupe = enCours || envoi;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
        <FileCheck size={16} /> Preuve de paiement
      </p>
      {url ? (
        <div className="space-y-2">
          {estPdf ? (
            <a href={url} target="_blank" rel="noreferrer" className="btn-secondaire">Ouvrir la preuve (PDF)</a>
          ) : (
            <a href={url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Preuve de paiement" className="max-h-80 w-full rounded-lg border border-border object-contain" />
            </a>
          )}
          {peutModifier && (
            <div className="flex gap-2">
              <button type="button" disabled={occupe} onClick={() => inputRef.current?.click()} className="btn-secondaire py-1.5 text-xs">
                {occupe ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Remplacer
              </button>
              <button
                type="button"
                disabled={occupe}
                onClick={() => {
                  if (confirm("Retirer cette preuve de paiement ?")) startTransition(async () => setEtat(await enregistrerPreuvePaiement(depenseId, null)));
                }}
                className="btn-secondaire py-1.5 text-xs text-danger"
              >
                <Trash2 size={14} /> Retirer
              </button>
            </div>
          )}
        </div>
      ) : peutModifier ? (
        <button type="button" disabled={occupe} onClick={() => inputRef.current?.click()} className="btn-secondaire w-full border-dashed py-3">
          {occupe ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {occupe ? "Envoi…" : "Joindre une capture, photo ou PDF"}
        </button>
      ) : (
        <p className="text-sm text-muted">Aucune preuve jointe.</p>
      )}
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && envoyer(e.target.files[0])} />
      <Message etat={etat} />
    </div>
  );
}
