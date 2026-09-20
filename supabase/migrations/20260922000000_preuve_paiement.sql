-- Preuve de paiement (capture Interac, reçu…) jointe à une dépense.
-- Modifiable par les deux parents ; rangée dans le bucket "recus" sous <user_id>/preuves/.
alter table public.depenses add column if not exists preuve_paiement_url text;

-- Règlement mensuel : une même preuve peut être appliquée à toutes les dépenses du mois.
drop function if exists public.confirmer_reglement_mois(int, int);
create or replace function public.confirmer_reglement_mois(p_annee int, p_mois int, p_preuve text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  autre uuid;
  net numeric;
  nb int;
  debut date := make_date(p_annee, p_mois, 1);
  fin date := (make_date(p_annee, p_mois, 1) + interval '1 month')::date;
begin
  if uid is null then
    raise exception 'Non authentifié';
  end if;
  autre := public.autre_profil(uid);

  select coalesce(sum(case when payeur_id = uid then public.montant_du(d) else -public.montant_du(d) end), 0)
    into net
  from public.depenses d
  where d.statut = 'non_paye' and d.date >= debut and d.date < fin;

  if net < 0 then
    raise exception 'Seul le créancier net du mois peut confirmer le règlement';
  end if;

  perform set_config('app.bypass_verif', 'on', true);

  update public.depenses d
     set statut = 'paye',
         paye_le = now(),
         paye_par_id = case when d.payeur_id = uid then autre else uid end,
         contestation_commentaire = null,
         preuve_paiement_url = coalesce(d.preuve_paiement_url, p_preuve)
   where d.statut = 'non_paye' and d.date >= debut and d.date < fin;
  get diagnostics nb = row_count;

  perform set_config('app.bypass_verif', 'off', true);
  return nb;
end;
$$;
