const fmtMontant = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" });
const fmtDateCourte = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short" });
const fmtDateLongue = new Intl.DateTimeFormat("fr-CA", { dateStyle: "long" });
const fmtDateHeure = new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" });
const fmtMois = new Intl.DateTimeFormat("fr-CA", { month: "long", year: "numeric" });

export function formatMontant(n: number | string | null | undefined) {
  return fmtMontant.format(Number(n ?? 0));
}

/** Date ISO (YYYY-MM-DD) → objet Date à midi local, pour éviter les décalages de fuseau. */
export function dateLocale(iso: string) {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j, 12);
}

export function formatDateCourte(iso: string) {
  return fmtDateCourte.format(dateLocale(iso));
}

export function formatDateLongue(iso: string) {
  return fmtDateLongue.format(dateLocale(iso));
}

export function formatDateHeure(ts: string | null | undefined) {
  if (!ts) return "";
  return fmtDateHeure.format(new Date(ts));
}

export function formatMois(annee: number, mois: number) {
  const s = fmtMois.format(new Date(annee, mois - 1, 15));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Aujourd'hui en YYYY-MM-DD (heure de Montréal). */
export function aujourdhuiISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function moisCourant() {
  const [a, m] = aujourdhuiISO().split("-").map(Number);
  return { annee: a, mois: m };
}

export function pluriel(n: number, singulier: string, plurielForme?: string) {
  return n > 1 ? (plurielForme ?? singulier + "s") : singulier;
}
