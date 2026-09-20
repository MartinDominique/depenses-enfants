"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { televerserFichier } from "@/lib/upload-client";

export function PhotoRecuInput({ userId, cheminInitial, urlInitiale }: { userId: string; cheminInitial?: string | null; urlInitiale?: string | null }) {
  const [chemin, setChemin] = useState(cheminInitial ?? "");
  const [apercu, setApercu] = useState<string | null>(urlInitiale ?? null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function envoyer(fichier: File) {
    setEnCours(true);
    setErreur(null);
    try {
      const { chemin: nouveauChemin, apercu: nouvelApercu } = await televerserFichier(fichier, userId, "recus");
      setChemin(nouveauChemin);
      setApercu(nouvelApercu);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Téléversement impossible.");
    } finally {
      setEnCours(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name="photo_recu_url" value={chemin} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && envoyer(e.target.files[0])}
      />
      {chemin ? (
        <div className="flex items-center gap-3">
          {apercu ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apercu} alt="Aperçu du reçu" className="h-20 w-20 rounded-lg border border-border object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-background text-xs text-muted">Fichier</div>
          )}
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={enCours} className="btn-secondaire py-1.5 text-xs">
              {enCours ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} Remplacer
            </button>
            <button
              type="button"
              onClick={() => {
                setChemin("");
                setApercu(null);
              }}
              className="btn-secondaire py-1.5 text-xs text-danger"
            >
              <Trash2 size={14} /> Retirer
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={enCours} className="btn-secondaire w-full border-dashed py-4">
          {enCours ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
          {enCours ? "Envoi du reçu…" : "Prendre une photo ou choisir un fichier"}
        </button>
      )}
      {erreur && <p className="mt-1 text-xs text-danger">{erreur}</p>}
    </div>
  );
}
