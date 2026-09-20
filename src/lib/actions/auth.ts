"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { EtatAction } from "./etat";

async function origine() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_APP_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function connexionMotDePasse(_prev: EtatAction, formData: FormData): Promise<EtatAction> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const suivant = String(formData.get("suivant") ?? "/");
  if (!email || !password) return { erreur: "Courriel et mot de passe requis." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { erreur: "Courriel ou mot de passe invalide." };
  redirect(suivant.startsWith("/") ? suivant : "/");
}

export async function connexionLienMagique(_prev: EtatAction, formData: FormData): Promise<EtatAction> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erreur: "Courriel requis." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // pas d'inscription publique
      emailRedirectTo: `${await origine()}/auth/callback`,
    },
  });
  if (error) return { erreur: "Impossible d'envoyer le lien. Ce courriel est-il bien celui d'un des deux comptes ?" };
  return { succes: `Un lien de connexion a été envoyé à ${email}.` };
}

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
