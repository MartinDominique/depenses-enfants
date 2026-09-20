import "server-only";
import { Resend } from "resend";
import { formatDateLongue, formatMontant } from "./format";
import { montantDu } from "./calculs";
import type { Depense, Profil } from "./types";

const SUJET_PREFIXE = "[Dépenses enfants]";

function from() {
  return process.env.EMAIL_FROM ?? "Dépenses enfants <depenses@servicestmt.ca>";
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "").replace(/\/$/, "");
}

function echapper(s: string | null | undefined) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Envoie un courriel ; `repondreA` = la personne à l'origine de l'action, pour que « Répondre » lui écrive directement. */
async function envoyer(to: string, sujet: string, html: string, repondreA?: Profil) {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    console.warn(`[email] RESEND_API_KEY absent — courriel non envoyé à ${to} : ${sujet}`);
    return;
  }
  try {
    const resend = new Resend(cle);
    const { error } = await resend.emails.send({
      from: from(),
      to: [to],
      subject: `${SUJET_PREFIXE} ${sujet}`,
      html,
      replyTo: repondreA ? `${repondreA.nom} <${repondreA.email}>` : undefined,
    });
    if (error) console.error("[email] Resend a échoué :", error);
  } catch (e) {
    console.error("[email] Erreur d'envoi :", e);
  }
}

function gabarit(titre: string, corps: string, depenseId?: string) {
  const url = appUrl();
  const lien = url ? `${url}/depenses/${depenseId ?? ""}` : "";
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#222;line-height:1.5">
    <h2 style="margin:0 0 12px;font-size:20px">${titre}</h2>
    ${corps}
    ${lien ? `<p style="margin-top:20px"><a href="${lien}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Voir dans l'application</a></p>` : ""}
    <p style="color:#888;font-size:12px;margin-top:24px">Courriel automatique de l'application Dépenses enfants.</p>
  </div>`;
}

function tableauDepense(d: Depense, payeur: Profil) {
  const ligne = (k: string, v: string) =>
    `<tr><td style="padding:4px 8px;color:#666;white-space:nowrap">${k}</td><td style="padding:4px 8px"><strong>${v}</strong></td></tr>`;
  return `<table style="border-collapse:collapse;background:#f6f7f9;border-radius:8px;width:100%">
    ${ligne("Date", formatDateLongue(d.date))}
    ${ligne("Description", echapper(d.description))}
    ${ligne("Montant total", formatMontant(d.montant_total) + " payé par " + echapper(payeur.nom))}
    ${ligne("Bénéficiaire", echapper(d.beneficiaire))}
    ${d.categorie ? ligne("Catégorie", echapper(d.categorie.nom)) : ""}
    ${ligne("Part à rembourser", `${Number(d.proportion_remboursement)} % = ${formatMontant(montantDu(d))}`)}
    ${d.notes ? ligne("Notes", echapper(d.notes)) : ""}
  </table>`;
}

export async function emailNouvelleDepense(d: Depense, payeur: Profil, destinataire: Profil) {
  const du = formatMontant(montantDu(d));
  const corps = `
    <p>Bonjour ${echapper(destinataire.nom)},</p>
    <p>${echapper(payeur.nom)} vient d'ajouter une dépense${d.statut === "paye" ? " (déjà réglée)" : ""}. Ta part est de <strong>${du}</strong>.</p>
    ${tableauDepense(d, payeur)}`;
  await envoyer(destinataire.email, `Nouvelle dépense : ${d.description} (${du})`, gabarit("Nouvelle dépense", corps, d.id), payeur);
}

export async function emailDepenseModifiee(d: Depense, payeur: Profil, destinataire: Profil) {
  const corps = `
    <p>Bonjour ${echapper(destinataire.nom)},</p>
    <p>${echapper(payeur.nom)} a modifié une dépense. Voici sa version à jour :</p>
    ${tableauDepense(d, payeur)}`;
  await envoyer(destinataire.email, `Dépense modifiée : ${d.description}`, gabarit("Dépense modifiée", corps, d.id), payeur);
}

export async function emailDepensePayee(d: Depense, payeur: Profil, destinataire: Profil) {
  const du = formatMontant(montantDu(d));
  const corps = `
    <p>Bonjour ${echapper(destinataire.nom)},</p>
    <p>${echapper(payeur.nom)} a confirmé avoir reçu ton remboursement de <strong>${du}</strong> pour la dépense suivante :</p>
    ${tableauDepense(d, payeur)}`;
  await envoyer(destinataire.email, `Remboursement confirmé : ${d.description} (${du})`, gabarit("Dépense marquée payée", corps, d.id), payeur);
}

export async function emailDepenseContestee(d: Depense, payeur: Profil, contestataire: Profil) {
  const corps = `
    <p>Bonjour ${echapper(payeur.nom)},</p>
    <p>${echapper(contestataire.nom)} conteste la dépense suivante :</p>
    ${tableauDepense(d, payeur)}
    <p style="margin-top:16px;padding:12px;border-left:4px solid #f59e0b;background:#fffbeb"><strong>Commentaire :</strong><br>${echapper(d.contestation_commentaire).replace(/\n/g, "<br>")}</p>
    <p>Tu peux corriger la dépense (elle repassera « en cours ») ou l'archiver.</p>`;
  await envoyer(payeur.email, `Dépense contestée : ${d.description}`, gabarit("Dépense contestée", corps, d.id), contestataire);
}

export async function emailReglementMensuel(
  libelleMois: string,
  nb: number,
  net: number,
  confirmateur: Profil,
  destinataire: Profil,
) {
  const corps = `
    <p>Bonjour ${echapper(destinataire.nom)},</p>
    <p>${echapper(confirmateur.nom)} a confirmé le règlement de <strong>${libelleMois}</strong> : ${nb} dépense${nb > 1 ? "s" : ""} marquée${nb > 1 ? "s" : ""} payée${nb > 1 ? "s" : ""}${net !== 0 ? ` pour un montant net de <strong>${formatMontant(Math.abs(net))}</strong>` : ""}.</p>`;
  const url = appUrl();
  await envoyer(
    destinataire.email,
    `Règlement de ${libelleMois} confirmé`,
    gabarit("Règlement mensuel confirmé", corps + (url ? `<p><a href="${url}/archives">Voir les archives</a></p>` : "")),
    confirmateur,
  );
}

export async function emailPreuvePaiement(d: Depense, payeur: Profil, auteur: Profil) {
  const du = formatMontant(montantDu(d));
  const corps = `
    <p>Bonjour ${echapper(payeur.nom)},</p>
    <p>${echapper(auteur.nom)} a joint une preuve de paiement de <strong>${du}</strong> pour la dépense suivante. Tu peux vérifier et marquer la dépense comme payée.</p>
    ${tableauDepense(d, payeur)}`;
  await envoyer(payeur.email, `Preuve de paiement : ${d.description} (${du})`, gabarit("Preuve de paiement jointe", corps, d.id), auteur);
}
