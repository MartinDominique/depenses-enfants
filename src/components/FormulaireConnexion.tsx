"use client";

import { useActionState, useState } from "react";
import { connexionLienMagique, connexionMotDePasse } from "@/lib/actions/auth";
import { Message } from "@/components/ui";

export function FormulaireConnexion({ suivant }: { suivant: string }) {
  const [mode, setMode] = useState<"mdp" | "lien">("mdp");
  const [etatMdp, actionMdp, enCoursMdp] = useActionState(connexionMotDePasse, null);
  const [etatLien, actionLien, enCoursLien] = useActionState(connexionLienMagique, null);

  return (
    <div className="carte p-6">
      {mode === "mdp" ? (
        <form action={actionMdp} className="space-y-4">
          <input type="hidden" name="suivant" value={suivant} />
          <div>
            <label className="etiquette" htmlFor="email">Courriel</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="champ" inputMode="email" />
          </div>
          <div>
            <label className="etiquette" htmlFor="password">Mot de passe</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="champ" />
          </div>
          <Message etat={etatMdp} />
          <button type="submit" disabled={enCoursMdp} className="btn-primaire w-full">
            {enCoursMdp ? "Connexion…" : "Se connecter"}
          </button>
          <button type="button" onClick={() => setMode("lien")} className="w-full text-center text-sm text-primary hover:underline">
            Recevoir un lien de connexion par courriel
          </button>
        </form>
      ) : (
        <form action={actionLien} className="space-y-4">
          <div>
            <label className="etiquette" htmlFor="email-lien">Courriel</label>
            <input id="email-lien" name="email" type="email" autoComplete="email" required className="champ" inputMode="email" />
          </div>
          <Message etat={etatLien} />
          <button type="submit" disabled={enCoursLien || !!etatLien?.succes} className="btn-primaire w-full">
            {enCoursLien ? "Envoi…" : "Envoyer le lien"}
          </button>
          <button type="button" onClick={() => setMode("mdp")} className="w-full text-center text-sm text-primary hover:underline">
            Utiliser un mot de passe
          </button>
        </form>
      )}
    </div>
  );
}
