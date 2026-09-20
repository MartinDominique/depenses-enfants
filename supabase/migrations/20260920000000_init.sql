-- ============================================================================
-- Dépenses enfants — schéma initial
-- Martin & Dominique — gestion des dépenses partagées pour les enfants
-- ============================================================================
-- Note : les identifiants sont en ASCII (cree_le, paye_le, envoye_le, ...)
-- pour éviter les problèmes d'encodage avec PostgREST / TypeScript.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,          -- 'Martin' ou 'Dominique'
  email text not null,        -- courriel utilisé pour les notifications
  cree_le timestamptz not null default now()
);

-- Création automatique du profil à la création du compte auth.
-- Le nom est pris dans raw_user_meta_data.nom, sinon dérivé du courriel.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nom, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nom', ''),
      initcap(split_part(new.email, '@', 1))
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- regles_remboursement (prorata annuel)
-- ----------------------------------------------------------------------------
create table if not exists public.regles_remboursement (
  id uuid primary key default gen_random_uuid(),
  annee int not null unique,
  proportion_martin numeric not null check (proportion_martin >= 0 and proportion_martin <= 100),
  proportion_dominique numeric not null check (proportion_dominique >= 0 and proportion_dominique <= 100),
  cree_le timestamptz not null default now(),
  constraint regles_total_100 check (proportion_martin + proportion_dominique = 100)
);

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type_proportion text not null default 'fixe' check (type_proportion in ('fixe', 'prorata')),
  proportion_fixe numeric check (proportion_fixe is null or (proportion_fixe >= 0 and proportion_fixe <= 100)),
  actif boolean not null default true,
  ordre int not null default 0,
  cree_le timestamptz not null default now(),
  constraint categories_fixe_a_proportion check (type_proportion <> 'fixe' or proportion_fixe is not null)
);

insert into public.categories (nom, type_proportion, proportion_fixe, ordre)
select * from (values
  ('Frais de garde', 'prorata', null::numeric, 1),
  ('Frais médical', 'prorata', null::numeric, 2),
  ('Dentaire', 'prorata', null::numeric, 3),
  ('Activité parascolaire', 'prorata', null::numeric, 4),
  ('Vêtements', 'fixe', 50::numeric, 5),
  ('Autre', 'fixe', 50::numeric, 6)
) as v(nom, type_proportion, proportion_fixe, ordre)
where not exists (select 1 from public.categories);

-- ----------------------------------------------------------------------------
-- parametres (ligne unique)
-- ----------------------------------------------------------------------------
create table if not exists public.parametres (
  id int primary key default 1 check (id = 1),
  delai_relance_jours int not null default 14 check (delai_relance_jours >= 1),
  modifie_le timestamptz not null default now()
);
insert into public.parametres (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- depenses
-- ----------------------------------------------------------------------------
create table if not exists public.depenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  description text not null,
  montant_total numeric(12,2) not null check (montant_total > 0),
  payeur_id uuid not null references public.profiles(id),           -- qui a payé
  beneficiaire text not null check (beneficiaire in ('Eugène', 'Lambert', 'Les 2', 'N/A')),
  categorie_id uuid references public.categories(id),
  proportion_remboursement numeric not null check (proportion_remboursement >= 0 and proportion_remboursement <= 100),
  methode_paiement text,
  notes text,
  photo_recu_url text,                                                -- chemin dans le bucket "recus"
  statut text not null default 'non_paye' check (statut in ('non_paye', 'paye', 'conteste', 'archive')),
  contestation_commentaire text,
  paye_par_id uuid references public.profiles(id),
  paye_le timestamptz,
  cree_par_id uuid not null references public.profiles(id),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

create index if not exists depenses_date_idx on public.depenses (date desc);
create index if not exists depenses_statut_idx on public.depenses (statut);
create index if not exists depenses_categorie_idx on public.depenses (categorie_id);

-- Montant dû par l'autre parent pour une dépense.
create or replace function public.montant_du(d public.depenses)
returns numeric
language sql
immutable
as $$
  select round(d.montant_total * d.proportion_remboursement / 100, 2);
$$;

-- Retourne l'id de "l'autre" profil (il n'y a que deux comptes).
create or replace function public.autre_profil(p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where id <> p_id order by cree_le limit 1;
$$;

-- ----------------------------------------------------------------------------
-- Règles de modification d'une dépense (appliquées par trigger, l'auteur de
-- la requête est auth.uid()).
--   * seul le créateur modifie une dépense non réglée (non_paye / conteste)
--   * seul le créditeur (payeur) peut passer le statut à 'paye' (et revenir)
--   * seul le débiteur peut passer le statut à 'conteste'
--   * seul le créateur peut archiver
--   * aucune suppression réelle (pas de policy delete)
-- ----------------------------------------------------------------------------
create or replace function public.depenses_verifier_modification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  champs_modifies boolean;
begin
  new.modifie_le := now();

  -- Appels service_role (edge functions, SQL admin) ou règlement mensuel : pas de vérification.
  if uid is null or current_setting('app.bypass_verif', true) = 'on' then
    return new;
  end if;

  -- Colonnes immuables
  if new.payeur_id is distinct from old.payeur_id
     or new.cree_par_id is distinct from old.cree_par_id
     or new.cree_le is distinct from old.cree_le then
    raise exception 'Le payeur et le créateur d''une dépense ne peuvent pas être modifiés';
  end if;

  champs_modifies :=
       new.date is distinct from old.date
    or new.description is distinct from old.description
    or new.montant_total is distinct from old.montant_total
    or new.beneficiaire is distinct from old.beneficiaire
    or new.categorie_id is distinct from old.categorie_id
    or new.proportion_remboursement is distinct from old.proportion_remboursement
    or new.methode_paiement is distinct from old.methode_paiement
    or new.notes is distinct from old.notes
    or new.photo_recu_url is distinct from old.photo_recu_url;

  if champs_modifies then
    if uid <> old.cree_par_id then
      raise exception 'Seul le créateur peut modifier cette dépense';
    end if;
    if old.statut not in ('non_paye', 'conteste') then
      raise exception 'Une dépense réglée ou archivée ne peut plus être modifiée';
    end if;
  end if;

  if new.statut is distinct from old.statut then
    if new.statut = 'paye' then
      if uid <> old.payeur_id then
        raise exception 'Seul le créditeur peut marquer une dépense comme payée';
      end if;
      if old.statut not in ('non_paye', 'conteste') then
        raise exception 'Cette dépense ne peut pas être marquée payée';
      end if;
      new.paye_le := coalesce(new.paye_le, now());
      new.paye_par_id := coalesce(new.paye_par_id, public.autre_profil(old.payeur_id));
      new.contestation_commentaire := null;

    elsif new.statut = 'conteste' then
      if uid = old.payeur_id then
        raise exception 'Seul le débiteur peut contester une dépense';
      end if;
      if old.statut <> 'non_paye' then
        raise exception 'Seule une dépense en cours peut être contestée';
      end if;
      if coalesce(trim(new.contestation_commentaire), '') = '' then
        raise exception 'Un commentaire est requis pour contester';
      end if;

    elsif new.statut = 'archive' then
      if uid <> old.cree_par_id then
        raise exception 'Seul le créateur peut archiver une dépense';
      end if;

    elsif new.statut = 'non_paye' then
      -- retour à "en cours" : le créancier annule un paiement, ou le créateur
      -- résout une contestation (généralement en corrigeant la dépense)
      if old.statut = 'paye' and uid <> old.payeur_id then
        raise exception 'Seul le créditeur peut annuler un paiement';
      end if;
      if old.statut in ('conteste', 'archive') and uid <> old.cree_par_id then
        raise exception 'Seul le créateur peut remettre cette dépense en cours';
      end if;
      new.paye_le := null;
      new.paye_par_id := null;
      new.contestation_commentaire := null;
    end if;
  elsif new.contestation_commentaire is distinct from old.contestation_commentaire
        and old.statut = 'conteste' and uid = old.payeur_id then
    raise exception 'Seul le débiteur peut modifier le commentaire de contestation';
  end if;

  return new;
end;
$$;

drop trigger if exists depenses_avant_modification on public.depenses;
create trigger depenses_avant_modification
  before update on public.depenses
  for each row execute function public.depenses_verifier_modification();

-- À l'insertion : le créateur est l'utilisateur courant.
create or replace function public.depenses_avant_insertion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.cree_par_id := auth.uid();
    if new.payeur_id is null then
      new.payeur_id := auth.uid();
    end if;
  end if;
  if new.statut = 'paye' then
    new.paye_le := coalesce(new.paye_le, now());
    new.paye_par_id := coalesce(new.paye_par_id, public.autre_profil(new.payeur_id));
  end if;
  return new;
end;
$$;

drop trigger if exists depenses_avant_insert on public.depenses;
create trigger depenses_avant_insert
  before insert on public.depenses
  for each row execute function public.depenses_avant_insertion();

-- ----------------------------------------------------------------------------
-- Règlement mensuel : marque toutes les dépenses non payées d'un mois comme
-- payées. Seul le créancier net du mois (ou n'importe qui si le net est 0)
-- peut confirmer.
-- ----------------------------------------------------------------------------
create or replace function public.confirmer_reglement_mois(p_annee int, p_mois int)
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
         contestation_commentaire = null
   where d.statut = 'non_paye' and d.date >= debut and d.date < fin;
  get diagnostics nb = row_count;

  perform set_config('app.bypass_verif', 'off', true);
  return nb;
end;
$$;

-- ----------------------------------------------------------------------------
-- relances (suivi des rappels envoyés)
-- ----------------------------------------------------------------------------
create table if not exists public.relances (
  id uuid primary key default gen_random_uuid(),
  depense_id uuid not null references public.depenses(id) on delete cascade,
  envoye_le timestamptz not null default now()
);
create index if not exists relances_depense_idx on public.relances (depense_id, envoye_le desc);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.regles_remboursement enable row level security;
alter table public.categories enable row level security;
alter table public.parametres enable row level security;
alter table public.depenses enable row level security;
alter table public.relances enable row level security;

-- profiles : lecture des deux profils, modification de son propre profil
drop policy if exists "profiles lecture" on public.profiles;
create policy "profiles lecture" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles modification" on public.profiles;
create policy "profiles modification" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- regles_remboursement : lecture / écriture par les deux comptes
drop policy if exists "regles lecture" on public.regles_remboursement;
create policy "regles lecture" on public.regles_remboursement
  for select to authenticated using (true);
drop policy if exists "regles insertion" on public.regles_remboursement;
create policy "regles insertion" on public.regles_remboursement
  for insert to authenticated with check (true);
drop policy if exists "regles modification" on public.regles_remboursement;
create policy "regles modification" on public.regles_remboursement
  for update to authenticated using (true) with check (true);
drop policy if exists "regles suppression" on public.regles_remboursement;
create policy "regles suppression" on public.regles_remboursement
  for delete to authenticated using (true);

-- categories : lecture / écriture, pas de suppression (désactivation seulement)
drop policy if exists "categories lecture" on public.categories;
create policy "categories lecture" on public.categories
  for select to authenticated using (true);
drop policy if exists "categories insertion" on public.categories;
create policy "categories insertion" on public.categories
  for insert to authenticated with check (true);
drop policy if exists "categories modification" on public.categories;
create policy "categories modification" on public.categories
  for update to authenticated using (true) with check (true);

-- parametres
drop policy if exists "parametres lecture" on public.parametres;
create policy "parametres lecture" on public.parametres
  for select to authenticated using (true);
drop policy if exists "parametres modification" on public.parametres;
create policy "parametres modification" on public.parametres
  for update to authenticated using (true) with check (true);

-- depenses : les deux voient tout ; insertion par le créateur ; modification
-- contrôlée par le trigger depenses_verifier_modification ; aucune suppression.
drop policy if exists "depenses lecture" on public.depenses;
create policy "depenses lecture" on public.depenses
  for select to authenticated using (true);
drop policy if exists "depenses insertion" on public.depenses;
create policy "depenses insertion" on public.depenses
  for insert to authenticated with check (cree_par_id = auth.uid());
drop policy if exists "depenses modification" on public.depenses;
create policy "depenses modification" on public.depenses
  for update to authenticated using (true) with check (true);

-- relances : lecture seulement (l'insertion est faite par la fonction cron en service_role)
drop policy if exists "relances lecture" on public.relances;
create policy "relances lecture" on public.relances
  for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- Storage : bucket privé "recus" pour les photos de reçus
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recus', 'recus', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "recus lecture" on storage.objects;
create policy "recus lecture" on storage.objects
  for select to authenticated using (bucket_id = 'recus');
drop policy if exists "recus insertion" on storage.objects;
create policy "recus insertion" on storage.objects
  for insert to authenticated with check (bucket_id = 'recus');
drop policy if exists "recus modification" on storage.objects;
create policy "recus modification" on storage.objects
  for update to authenticated using (bucket_id = 'recus');

-- ----------------------------------------------------------------------------
-- Relances automatiques : pg_cron appelle chaque jour l'Edge Function
-- "relances" (voir supabase/functions/relances). L'URL du projet et le secret
-- sont lus dans Vault ; voir README pour la configuration :
--
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
-- ----------------------------------------------------------------------------
create or replace function public.lancer_relances()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  url text;
  secret text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret' limit 1;
  if url is null or secret is null then
    raise notice 'Relances : secrets project_url / cron_secret absents de Vault, appel ignoré';
    return;
  end if;
  perform net.http_post(
    url := url || '/functions/v1/relances',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

-- Tous les jours à 12:00 UTC (8h heure de Montréal en été, 7h en hiver)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'relances-quotidiennes') then
    perform cron.unschedule('relances-quotidiennes');
  end if;
  perform cron.schedule('relances-quotidiennes', '0 12 * * *', 'select public.lancer_relances()');
end;
$$;
