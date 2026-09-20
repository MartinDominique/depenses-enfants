"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Réduit l'image côté client (max 1600 px, JPEG 82 %) avant l'envoi. */
async function compresser(fichier: File): Promise<Blob> {
  if (!fichier.type.startsWith("image/") || fichier.type === "image/heic") return fichier;
  const bitmap = await createImageBitmap(fichier).catch(() => null);
  if (!bitmap) return fichier;
  const MAX = 1600;
  const ratio = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? fichier), "image/jpeg", 0.82));
}

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
      const blob = await compresser(fichier);
      const ext = blob.type === "image/jpeg" ? "jpg" : (fichier.name.split(".").pop() ?? "bin").toLowerCase();
      const nouveauChemin = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("recus").upload(nouveauChemin, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      setChemin(nouveauChemin);
      setApercu(blob.type.startsWith("image/") ? URL.createObjectURL(blob) : null);
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
