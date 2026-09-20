"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { Categorie } from "@/lib/types";

type Option = { valeur: string; libelle: string };

export function Filtres({
  categories,
  optionsStatut,
  mois,
}: {
  categories: Pick<Categorie, "id" | "nom">[];
  optionsStatut: Option[];
  mois: string[]; // YYYY-MM disponibles
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");

  function maj(cle: string, valeur: string) {
    const p = new URLSearchParams(sp.toString());
    if (valeur) p.set(cle, valeur);
    else p.delete(cle);
    startTransition(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  }

  // Recherche texte avec léger délai
  useEffect(() => {
    const actuel = sp.get("q") ?? "";
    if (q === actuel) return;
    const t = setTimeout(() => maj("q", q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const aFiltres = ["mois", "categorie", "statut", "q"].some((k) => sp.get(k));

  const fmtMois = new Intl.DateTimeFormat("fr-CA", { month: "long", year: "numeric" });

  return (
    <div className="mb-4 space-y-2">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une dépense…"
          className="champ pl-10"
          aria-label="Recherche"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <select value={sp.get("mois") ?? ""} onChange={(e) => maj("mois", e.target.value)} className="champ w-auto min-w-36 py-2 text-sm" aria-label="Mois">
          <option value="">Toutes les dates</option>
          {mois.map((m) => {
            const [a, mm] = m.split("-").map(Number);
            const lib = fmtMois.format(new Date(a, mm - 1, 15));
            return (
              <option key={m} value={m}>
                {lib.charAt(0).toUpperCase() + lib.slice(1)}
              </option>
            );
          })}
        </select>
        <select value={sp.get("categorie") ?? ""} onChange={(e) => maj("categorie", e.target.value)} className="champ w-auto min-w-36 py-2 text-sm" aria-label="Catégorie">
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        <select value={sp.get("statut") ?? ""} onChange={(e) => maj("statut", e.target.value)} className="champ w-auto min-w-32 py-2 text-sm" aria-label="Statut">
          {optionsStatut.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
        {aFiltres && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
            className="btn-secondaire shrink-0 py-2 text-sm"
          >
            <X size={16} /> Effacer
          </button>
        )}
      </div>
    </div>
  );
}
