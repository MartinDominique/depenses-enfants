"use client";

import { createClient } from "@/lib/supabase/client";

/** Réduit l'image côté client (max 1600 px, JPEG 82 %) avant l'envoi. */
export async function compresserImage(fichier: File): Promise<Blob> {
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

/** Téléverse un fichier dans le bucket "recus" sous <userId>/<dossier>/ et retourne son chemin. */
export async function televerserFichier(fichier: File, userId: string, dossier: "recus" | "preuves") {
  const blob = await compresserImage(fichier);
  const ext = blob.type === "image/jpeg" ? "jpg" : (fichier.name.split(".").pop() ?? "bin").toLowerCase();
  const chemin = `${userId}/${dossier}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from("recus").upload(chemin, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return { chemin, apercu: blob.type.startsWith("image/") ? URL.createObjectURL(blob) : null };
}
