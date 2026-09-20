"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, X } from "lucide-react";
import { ajouterCategorie, basculerCategorie, modifierCategorie, reordonnerCategories } from "@/lib/actions/parametres";
import type { EtatAction } from "@/lib/actions/etat";
import type { Categorie } from "@/lib/types";
import { Message } from "../ui";

function ChampsCategorie({ cat }: { cat?: Categorie }) {
  const [type, setType] = useState<"fixe" | "prorata">(cat?.type_proportion ?? "fixe");
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
      <div>
        <label className="etiquette">Nom</label>
        <input name="nom" required defaultValue={cat?.nom ?? ""} className="champ py-2" placeholder="Nouvelle catégorie" />
      </div>
      <div>
        <label className="etiquette">Type</label>
        <select name="type_proportion" value={type} onChange={(e) => setType(e.target.value as "fixe" | "prorata")} className="champ w-auto py-2">
          <option value="fixe">Fixe</option>
          <option value="prorata">Prorata annuel</option>
        </select>
      </div>
      <div className={type === "fixe" ? "" : "invisible"}>
        <label className="etiquette">%</label>
        <input name="proportion_fixe" type="number" min={0} max={100} step="0.01" defaultValue={cat?.proportion_fixe ?? 50} className="champ w-20 py-2" />
      </div>
    </div>
  );
}

function LigneCategorie({ cat, index, total, ids }: { cat: Categorie; index: number; total: number; ids: string[] }) {
  const [edition, setEdition] = useState(false);
  const [enCours, startTransition] = useTransition();
  const [etat, actionModif, enCoursModif] = useActionState(
    async (prev: EtatAction, fd: FormData) => {
      const r = await modifierCategorie(cat.id, prev, fd);
      if (r?.succes) setEdition(false);
      return r;
    },
    null,
  );

  function deplacer(delta: number) {
    const nouveau = [...ids];
    const j = index + delta;
    [nouveau[index], nouveau[j]] = [nouveau[j], nouveau[index]];
    startTransition(async () => {
      await reordonnerCategories(nouveau);
    });
  }

  if (edition) {
    return (
      <li className="bg-background/60 p-3">
        <form action={actionModif} className="space-y-2">
          <ChampsCategorie cat={cat} />
          <Message etat={etat} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEdition(false)} className="btn-secondaire py-1.5 text-xs">Annuler</button>
            <button type="submit" disabled={enCoursModif} className="btn-primaire py-1.5 text-xs">Enregistrer</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`flex items-center gap-2 p-3 ${cat.actif ? "" : "opacity-50"}`}>
      <div className="flex flex-col">
        <button type="button" disabled={index === 0 || enCours} onClick={() => deplacer(-1)} className="rounded p-0.5 text-muted hover:bg-background disabled:opacity-30" aria-label="Monter"><ArrowUp size={14} /></button>
        <button type="button" disabled={index === total - 1 || enCours} onClick={() => deplacer(1)} className="rounded p-0.5 text-muted hover:bg-background disabled:opacity-30" aria-label="Descendre"><ArrowDown size={14} /></button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{cat.nom}</p>
        <p className="text-xs text-muted">{cat.type_proportion === "fixe" ? `${cat.proportion_fixe} % fixe` : "Prorata annuel"}</p>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-muted">
        <input
          type="checkbox"
          checked={cat.actif}
          disabled={enCours}
          onChange={(e) => startTransition(async () => { await basculerCategorie(cat.id, e.target.checked); })}
          className="h-4 w-4 accent-primary"
        />
        Active
      </label>
      <button type="button" onClick={() => setEdition(true)} className="rounded-lg p-2 text-muted hover:bg-background" aria-label="Modifier"><Pencil size={16} /></button>
    </li>
  );
}

export function Categories({ categories }: { categories: Categorie[] }) {
  const [ajout, setAjout] = useState(false);
  const [etat, actionAjout, enCours] = useActionState(
    async (prev: EtatAction, fd: FormData) => {
      const r = await ajouterCategorie(prev, fd);
      if (r?.succes) setAjout(false);
      return r;
    },
    null,
  );
  const ids = categories.map((c) => c.id);

  return (
    <section className="carte">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">Catégories</h2>
        <button type="button" onClick={() => setAjout((v) => !v)} className="btn-secondaire py-1.5 text-xs">
          {ajout ? <X size={14} /> : <Plus size={14} />} {ajout ? "Fermer" : "Ajouter"}
        </button>
      </div>
      {ajout && (
        <form action={actionAjout} className="space-y-2 border-b border-border bg-background/60 p-3">
          <ChampsCategorie />
          <Message etat={etat} />
          <div className="flex justify-end">
            <button type="submit" disabled={enCours} className="btn-primaire py-1.5 text-xs">Ajouter la catégorie</button>
          </div>
        </form>
      )}
      <ul className="divide-y divide-border">
        {categories.map((c, i) => (
          <LigneCategorie key={c.id} cat={c} index={i} total={categories.length} ids={ids} />
        ))}
      </ul>
      <p className="px-4 py-2 text-xs text-muted">Une catégorie inactive n&apos;est plus proposée à la saisie mais reste visible sur les anciennes dépenses.</p>
    </section>
  );
}
