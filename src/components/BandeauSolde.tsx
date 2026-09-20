import { formatMontant } from "@/lib/format";
import type { Profil } from "@/lib/types";

export function BandeauSolde({ net, autre, nbEnCours, nbContestees }: { net: number; autre: Profil | null; nbEnCours: number; nbContestees: number }) {
  const nomAutre = autre?.nom ?? "L'autre parent";
  let texte: string;
  let classes: string;
  if (Math.abs(net) < 0.005) {
    texte = "Vous êtes à jour";
    classes = "from-emerald-600 to-teal-600";
  } else if (net > 0) {
    texte = `${nomAutre} te doit ${formatMontant(net)}`;
    classes = "from-blue-600 to-indigo-600";
  } else {
    texte = `Tu dois ${formatMontant(-net)} à ${nomAutre}`;
    classes = "from-orange-500 to-rose-600";
  }
  return (
    <div className={`mb-4 rounded-2xl bg-gradient-to-br ${classes} p-5 text-white shadow-md`}>
      <p className="text-sm/5 opacity-80">Solde des dépenses en cours</p>
      <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{texte}</p>
      <p className="mt-2 text-xs opacity-80">
        {nbEnCours} dépense{nbEnCours > 1 ? "s" : ""} en attente
        {nbContestees > 0 && ` · ${nbContestees} contestée${nbContestees > 1 ? "s" : ""} (exclue${nbContestees > 1 ? "s" : ""} du solde)`}
      </p>
    </div>
  );
}
