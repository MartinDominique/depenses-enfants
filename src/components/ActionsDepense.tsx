"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Archive, ArchiveRestore, Check, MessageSquareWarning, Pencil, Trash2, Undo2 } from "lucide-react";
import { archiverDepense, changerStatutPaye, contesterDepense, supprimerDepense } from "@/lib/actions/depenses";
import type { EtatAction } from "@/lib/actions/etat";
import type { Depense, Profil } from "@/lib/types";
import { Message } from "./ui";

export function ActionsDepense({ d, moi }: { d: Depense; moi: Profil }) {
  const jeSuisCrediteur = d.payeur_id === moi.id;
  const jeSuisCreateur = d.cree_par_id === moi.id;
  const [enCours, startTransition] = useTransition();
  const [etat, setEtat] = useState<EtatAction>(null);
  const [contester, setContester] = useState(false);
  const [etatContest, actionContest, enCoursContest] = useActionState(contesterDepense.bind(null, d.id), null);

  function lancer(fn: () => Promise<EtatAction>) {
    setEtat(null);
    startTransition(async () => setEtat(await fn()));
  }

  const boutons: React.ReactNode[] = [];

  if (jeSuisCrediteur && (d.statut === "non_paye" || d.statut === "conteste")) {
    boutons.push(
      <button key="payer" type="button" disabled={enCours} onClick={() => lancer(() => changerStatutPaye(d.id, true))} className="btn-succes">
        <Check size={18} /> Marquer payé
      </button>,
    );
  }
  if (jeSuisCrediteur && d.statut === "paye") {
    boutons.push(
      <button key="annuler" type="button" disabled={enCours} onClick={() => lancer(() => changerStatutPaye(d.id, false))} className="btn-secondaire">
        <Undo2 size={18} /> Annuler le paiement
      </button>,
    );
  }
  if (!jeSuisCrediteur && d.statut === "non_paye") {
    boutons.push(
      <button key="contester" type="button" onClick={() => setContester((v) => !v)} className="btn-secondaire text-warning">
        <MessageSquareWarning size={18} /> Contester
      </button>,
    );
  }
  if (jeSuisCreateur && (d.statut === "non_paye" || d.statut === "conteste")) {
    boutons.push(
      <Link key="modifier" href={`/depenses/${d.id}/modifier`} className="btn-secondaire">
        <Pencil size={18} /> Modifier
      </Link>,
    );
  }
  if (jeSuisCreateur && d.statut !== "archive") {
    boutons.push(
      <button
        key="archiver"
        type="button"
        disabled={enCours}
        onClick={() => {
          if (confirm("Archiver cette dépense ? Elle sera retirée de la liste et du solde, mais restera consultable dans Archives."))
            lancer(() => archiverDepense(d.id, true));
        }}
        className="btn-secondaire text-muted"
      >
        <Archive size={18} /> Archiver
      </button>,
    );
  }
  if (jeSuisCreateur) {
    boutons.push(
      <button
        key="supprimer"
        type="button"
        disabled={enCours}
        onClick={() => {
          if (confirm("Supprimer définitivement cette dépense ? Cette action est irréversible."))
            lancer(() => supprimerDepense(d.id));
        }}
        className="btn-secondaire text-danger"
      >
        <Trash2 size={18} /> Supprimer
      </button>,
    );
  }
  if (jeSuisCreateur && d.statut === "archive") {
    boutons.push(
      <button key="restaurer" type="button" disabled={enCours} onClick={() => lancer(() => archiverDepense(d.id, false))} className="btn-secondaire">
        <ArchiveRestore size={18} /> Remettre en cours
      </button>,
    );
  }

  return (
    <div className="space-y-3">
      {boutons.length > 0 && <div className="flex flex-wrap gap-2">{boutons}</div>}
      <Message etat={etat} />
      {contester && d.statut === "non_paye" && (
        <form action={actionContest} className="carte space-y-3 border-warning/50 p-4">
          <label className="etiquette" htmlFor="commentaire">Pourquoi contestes-tu cette dépense ?</label>
          <textarea id="commentaire" name="commentaire" rows={3} required className="champ" placeholder="Ex. : le montant ne correspond pas au reçu…" />
          <Message etat={etatContest} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setContester(false)} className="btn-secondaire flex-1">Annuler</button>
            <button type="submit" disabled={enCoursContest} className="btn-danger flex-1">
              {enCoursContest ? "Envoi…" : "Envoyer la contestation"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
