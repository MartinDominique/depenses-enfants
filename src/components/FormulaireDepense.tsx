"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { proportionSuggeree, montantDu } from "@/lib/calculs";
import type { EtatAction } from "@/lib/actions/etat";
import { BENEFICIAIRES, METHODES_PAIEMENT, type Categorie, type Depense, type Profil, type RegleRemboursement } from "@/lib/types";
import { formatMontant } from "@/lib/format";
import { Message } from "./ui";
import { PhotoRecuInput } from "./PhotoRecuInput";

type Props = {
  action: (prev: EtatAction, formData: FormData) => Promise<EtatAction>;
  categories: Categorie[];
  regles: RegleRemboursement[];
  moi: Profil;
  autre: Profil | null;
  dateDefaut: string;
  depense?: Depense | null;
  urlRecu?: string | null;
};

export function FormulaireDepense({ action, categories, regles, moi, autre, dateDefaut, depense, urlRecu }: Props) {
  const [etat, formAction, enCours] = useActionState(action, null);
  const c = etat?.champs;

  const [date, setDate] = useState(c?.date ?? depense?.date ?? dateDefaut);
  const [montant, setMontant] = useState(c?.montant_total ?? (depense ? String(depense.montant_total) : ""));
  const [beneficiaire, setBeneficiaire] = useState(c?.beneficiaire ?? depense?.beneficiaire ?? "Les 2");
  const [categorieId, setCategorieId] = useState(c?.categorie_id ?? depense?.categorie_id ?? categories[0]?.id ?? "");
  // null = suivre la suggestion (catégorie / prorata) ; sinon valeur saisie à la main.
  const [proportionManuelle, setProportionManuelle] = useState<string | null>(
    c?.proportion_remboursement ?? (depense ? String(depense.proportion_remboursement) : null),
  );

  const categorie = categories.find((x) => x.id === categorieId);
  const suggestion = useMemo(() => proportionSuggeree(categorie, date, moi, regles), [categorie, date, moi, regles]);
  const manuelle = proportionManuelle !== null;
  const proportion = proportionManuelle ?? String(suggestion.proportion);

  // Dépense personnelle (N/A) : 100 % dû par l'autre, sauf si l'utilisateur a saisi autre chose.
  function changerBeneficiaire(v: string) {
    setBeneficiaire(v);
    if (v === "N/A") {
      setProportionManuelle("100");
    } else if (proportionManuelle === "100" && !depense) {
      setProportionManuelle(null);
    }
  }

  const m = Number(String(montant).replace(",", "."));
  const p = Number(String(proportion).replace(",", "."));
  const du = Number.isFinite(m) && Number.isFinite(p) ? montantDu({ montant_total: m, proportion_remboursement: p }) : 0;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="etiquette" htmlFor="date">Date</label>
        <input id="date" name="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="champ" />
      </div>

      <div>
        <label className="etiquette" htmlFor="description">Description</label>
        <input
          id="description"
          name="description"
          required
          maxLength={200}
          defaultValue={c?.description ?? depense?.description ?? ""}
          placeholder="Ex. : Garderie — septembre"
          className="champ"
          autoFocus={!depense}
        />
      </div>

      <div>
        <label className="etiquette" htmlFor="montant_total">Montant total payé</label>
        <div className="relative">
          <input
            id="montant_total"
            name="montant_total"
            type="text"
            inputMode="decimal"
            required
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="0,00"
            className="champ pr-8 text-lg font-semibold"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">$</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="etiquette" htmlFor="beneficiaire">Bénéficiaire</label>
          <select id="beneficiaire" name="beneficiaire" value={beneficiaire} onChange={(e) => changerBeneficiaire(e.target.value)} className="champ">
            {BENEFICIAIRES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiquette" htmlFor="categorie_id">Catégorie</label>
          <select
            id="categorie_id"
            name="categorie_id"
            value={categorieId}
            onChange={(e) => {
              setCategorieId(e.target.value);
              setProportionManuelle(null);
            }}
            className="champ"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nom}{cat.actif ? "" : " (inactive)"}</option>
            ))}
            <option value="">Sans catégorie</option>
          </select>
        </div>
      </div>

      <div>
        <label className="etiquette" htmlFor="proportion_remboursement">
          Proportion à rembourser par {autre?.nom ?? "l'autre parent"}
        </label>
        <div className="flex items-center gap-3">
          <div className="relative w-32">
            <input
              id="proportion_remboursement"
              name="proportion_remboursement"
              type="number"
              min={0}
              max={100}
              step="0.01"
              required
              value={proportion}
              onChange={(e) => setProportionManuelle(e.target.value)}
              className="champ pr-8"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">%</span>
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">{formatMontant(du)} dû</p>
            <p className="truncate text-xs text-muted" title={suggestion.source}>
              {manuelle && Number(proportion) !== suggestion.proportion ? (
                <button type="button" className="text-primary hover:underline" onClick={() => setProportionManuelle(null)}>
                  Rétablir {suggestion.proportion} % ({suggestion.source})
                </button>
              ) : (
                suggestion.source
              )}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="etiquette" htmlFor="methode_paiement">Méthode de paiement <span className="font-normal">(optionnel)</span></label>
        <input
          id="methode_paiement"
          name="methode_paiement"
          list="methodes"
          defaultValue={c?.methode_paiement ?? depense?.methode_paiement ?? ""}
          placeholder="Interac, carte, cash…"
          className="champ"
        />
        <datalist id="methodes">
          {METHODES_PAIEMENT.map((mp) => (
            <option key={mp} value={mp} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="etiquette" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={c?.notes ?? depense?.notes ?? ""} className="champ" />
      </div>

      <div>
        <span className="etiquette">Photo du reçu <span className="font-normal">(optionnel)</span></span>
        <PhotoRecuInput userId={moi.id} cheminInitial={c?.photo_recu_url ?? depense?.photo_recu_url} urlInitiale={urlRecu} />
      </div>

      {!depense && (
        <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3">
          <input type="checkbox" name="deja_paye" defaultChecked={c?.deja_paye === "on"} className="h-5 w-5 accent-primary" />
          <span className="text-sm">
            <span className="font-medium">Déjà payé</span>
            <span className="block text-xs text-muted">La dépense est réglée immédiatement (rare)</span>
          </span>
        </label>
      )}

      <Message etat={etat} />

      <div className="flex gap-3 pt-2">
        <Link href={depense ? `/depenses/${depense.id}` : "/"} className="btn-secondaire flex-1">
          Annuler
        </Link>
        <button type="submit" disabled={enCours} className="btn-primaire flex-1">
          {enCours ? "Enregistrement…" : depense ? "Enregistrer" : "Ajouter la dépense"}
        </button>
      </div>
    </form>
  );
}
