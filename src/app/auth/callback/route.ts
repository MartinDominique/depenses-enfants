import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Échange le code du lien magique contre une session. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const suivant = searchParams.get("suivant") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${suivant.startsWith("/") ? suivant : "/"}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?erreur=lien`);
}
