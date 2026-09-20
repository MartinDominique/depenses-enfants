import type { Metadata } from "next";
import { FormulaireConnexion } from "@/components/FormulaireConnexion";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Connexion" };

export default async function PageConnexion({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const suivant = typeof sp.suivant === "string" ? sp.suivant : "/";
  const erreurLien = sp.erreur === "lien";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="mx-auto mb-4 h-20 w-20 drop-shadow-lg" />
          <h1 className="text-2xl font-bold">Dépenses enfants</h1>
          <p className="mt-1 text-sm text-muted">Martin &amp; Dominique</p>
        </div>
        {erreurLien && (
          <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            Ce lien de connexion est invalide ou expiré. Demande un nouveau lien.
          </p>
        )}
        <FormulaireConnexion suivant={suivant} />
      </div>
    </main>
  );
}
