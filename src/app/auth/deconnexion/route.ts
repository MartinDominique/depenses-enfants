import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Déconnexion par requête classique (pas de Server Action) : reste valide même si
 *  la page ouverte date d'un déploiement précédent. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

export const GET = POST;
