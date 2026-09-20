"use client";

import { useActionState } from "react";
import { modifierParametres, modifierProfil } from "@/lib/actions/parametres";
import { changerMotDePasse } from "@/lib/actions/auth";
import type { Parametres, Profil } from "@/lib/types";
import { Message } from "../ui";

export function ProfilForm({ moi, emailConnexion }: { moi: Profil; emailConnexion: string }) {
  const [etat, action, enCours] = useActionState(modifierProfil, null);
  return (
    <section className="carte">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">Mon profil</h2>
        <p className="text-xs text-muted">Connecté avec {emailConnexion}</p>
      </div>
      <form action={action} className="space-y-3 p-4">
        <div>
          <label className="etiquette" htmlFor="nom">Nom affiché</label>
          <input id="nom" name="nom" defaultValue={moi.nom} required className="champ py-2" />
        </div>
        <div>
          <label className="etiquette" htmlFor="email">Courriel pour les notifications</label>
          <input id="email" name="email" type="email" defaultValue={moi.email} required className="champ py-2" />
        </div>
        <Message etat={etat} />
        <div className="flex justify-end">
          <button type="submit" disabled={enCours} className="btn-primaire py-1.5 text-xs">Enregistrer</button>
        </div>
      </form>
    </section>
  );
}

export function MotDePasseForm() {
  const [etat, action, enCours] = useActionState(changerMotDePasse, null);
  return (
    <section className="carte">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">Changer mon mot de passe</h2>
        <p className="text-xs text-muted">Mot de passe oublié ? Connecte-toi avec le lien magique par courriel, puis définis-en un nouveau ici.</p>
      </div>
      <form action={action} className="space-y-3 p-4" autoComplete="off">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etiquette" htmlFor="nouveau">Nouveau mot de passe</label>
            <input id="nouveau" name="nouveau" type="password" minLength={8} required autoComplete="new-password" className="champ py-2" />
          </div>
          <div>
            <label className="etiquette" htmlFor="confirmation">Confirmation</label>
            <input id="confirmation" name="confirmation" type="password" minLength={8} required autoComplete="new-password" className="champ py-2" />
          </div>
        </div>
        <Message etat={etat} />
        <div className="flex justify-end">
          <button type="submit" disabled={enCours} className="btn-primaire py-1.5 text-xs">{enCours ? "Enregistrement…" : "Changer le mot de passe"}</button>
        </div>
      </form>
    </section>
  );
}

export function RelancesForm({ parametres }: { parametres: Parametres }) {
  const [etat, action, enCours] = useActionState(modifierParametres, null);
  return (
    <section className="carte">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">Rappels automatiques</h2>
        <p className="text-xs text-muted">Un courriel de rappel est envoyé au débiteur pour toute dépense non payée après ce délai, au plus une fois par période.</p>
      </div>
      <form action={action} className="flex items-end gap-3 p-4">
        <div>
          <label className="etiquette" htmlFor="delai_relance_jours">Délai (jours)</label>
          <input id="delai_relance_jours" name="delai_relance_jours" type="number" min={1} max={365} defaultValue={parametres.delai_relance_jours} required className="champ w-28 py-2" />
        </div>
        <button type="submit" disabled={enCours} className="btn-primaire py-2 text-xs">Enregistrer</button>
        <div className="flex-1"><Message etat={etat} /></div>
      </form>
    </section>
  );
}
