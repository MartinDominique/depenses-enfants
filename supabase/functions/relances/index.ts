// Edge Function "relances" — appelée chaque jour par pg_cron (voir migration).
// Envoie un courriel de rappel au débiteur pour chaque dépense non payée depuis
// plus de `parametres.delai_relance_jours` jours, en regroupant par débiteur.
// Chaque relance est journalisée dans `relances` : une dépense n'est relancée
// qu'une fois par période de `delai_relance_jours`.
//
// Secrets requis (supabase secrets set ...):
//   RESEND_API_KEY, CRON_SECRET, EMAIL_FROM (optionnel), APP_URL (optionnel)
//   SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement.

import { createClient } from "npm:@supabase/supabase-js@2";

type Profil = { id: string; nom: string; email: string };
type Depense = {
  id: string;
  date: string;
  description: string;
  montant_total: number;
  proportion_remboursement: number;
  beneficiaire: string;
  payeur_id: string;
  cree_le: string;
  categories: { nom: string } | null;
};

const SUJET_PREFIXE = "[Dépenses enfants]";

function formatMontant(n: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "long", timeZone: "America/Toronto" }).format(new Date(d + "T12:00:00"));
}

function echapper(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") ?? "Dépenses enfants <depenses@servicestmt.ca>";
  const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/$/, "");

  const { data: parametres } = await supabase.from("parametres").select("delai_relance_jours").eq("id", 1).single();
  const delai = parametres?.delai_relance_jours ?? 14;
  const limite = new Date(Date.now() - delai * 24 * 60 * 60 * 1000).toISOString();

  const { data: profils } = await supabase.from("profiles").select("id, nom, email");
  const parId = new Map<string, Profil>((profils ?? []).map((p) => [p.id, p as Profil]));

  const { data: depenses, error } = await supabase
    .from("depenses")
    .select("id, date, description, montant_total, proportion_remboursement, beneficiaire, payeur_id, cree_le, categories(nom)")
    .eq("statut", "non_paye")
    .lt("cree_le", limite)
    .order("date");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Exclure les dépenses déjà relancées dans la période.
  const ids = (depenses ?? []).map((d) => d.id);
  const { data: recentes } = ids.length
    ? await supabase.from("relances").select("depense_id").in("depense_id", ids).gte("envoye_le", limite)
    : { data: [] };
  const dejaRelancees = new Set((recentes ?? []).map((r) => r.depense_id));

  const aRelancer = ((depenses ?? []) as unknown as Depense[]).filter((d) => !dejaRelancees.has(d.id));

  // Regrouper par débiteur (= l'autre que le payeur)
  const parDebiteur = new Map<string, Depense[]>();
  for (const d of aRelancer) {
    const debiteur = [...parId.values()].find((p) => p.id !== d.payeur_id);
    if (!debiteur) continue;
    parDebiteur.set(debiteur.id, [...(parDebiteur.get(debiteur.id) ?? []), d]);
  }

  let envoyes = 0;
  for (const [debiteurId, liste] of parDebiteur) {
    const debiteur = parId.get(debiteurId)!;
    const crediteur = parId.get(liste[0].payeur_id);
    const total = liste.reduce((s, d) => s + Math.round(d.montant_total * d.proportion_remboursement) / 100, 0);

    const lignes = liste
      .map((d) => {
        const du = Math.round(d.montant_total * d.proportion_remboursement) / 100;
        return `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${formatDate(d.date)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${echapper(d.description)}${d.categories ? ` <span style="color:#666">(${echapper(d.categories.nom)})</span>` : ""}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatMontant(du)}</td>
        </tr>`;
      })
      .join("");

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#222">
        <h2 style="margin:0 0 12px">Rappel : ${liste.length} dépense${liste.length > 1 ? "s" : ""} en attente</h2>
        <p>Bonjour ${echapper(debiteur.nom)},</p>
        <p>${liste.length > 1 ? "Les dépenses suivantes sont" : "La dépense suivante est"} en attente de remboursement à ${echapper(crediteur?.nom ?? "l'autre parent")} depuis plus de ${delai} jours :</p>
        <table style="border-collapse:collapse;width:100%">${lignes}</table>
        <p style="font-size:18px;margin-top:16px"><strong>Total dû : ${formatMontant(total)}</strong></p>
        ${appUrl ? `<p><a href="${appUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Ouvrir l'application</a></p>` : ""}
        <p style="color:#888;font-size:12px">Ce rappel automatique est envoyé au plus une fois tous les ${delai} jours par dépense.</p>
      </div>`;

    if (resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [debiteur.email],
          reply_to: crediteur ? `${crediteur.nom} <${crediteur.email}>` : undefined,
          subject: `${SUJET_PREFIXE} Rappel : ${formatMontant(total)} en attente de remboursement`,
          html,
        }),
      });
      if (!res.ok) {
        console.error("Resend a échoué", await res.text());
        continue;
      }
    } else {
      console.log("RESEND_API_KEY absent — relance non envoyée à", debiteur.email);
    }

    const { error: errLog } = await supabase
      .from("relances")
      .insert(liste.map((d) => ({ depense_id: d.id })));
    if (errLog) console.error("Journalisation des relances échouée", errLog.message);
    envoyes += liste.length;
  }

  return new Response(JSON.stringify({ ok: true, relances: envoyes, delai_jours: delai }), {
    headers: { "Content-Type": "application/json" },
  });
});
