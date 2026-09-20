# Dépenses enfants — Martin & Dominique

Application de suivi des dépenses partagées pour Eugène et Lambert.
PWA mobile-first (installable sur téléphone), pleinement utilisable sur PC.

**Stack** : Next.js 16 (App Router, Server Actions) · Supabase (Auth, Postgres, Storage, Edge Functions, pg_cron) · Resend · Vercel · Tailwind CSS 4.

## Fonctionnalités

- **Accueil** : bandeau de solde en temps réel (« Dominique te doit 342 $ »), liste des dépenses en cours, filtres (mois, catégorie, statut, recherche), case « marquer payé » visible seulement pour le créditeur, bouton flottant « + Dépense ».
- **Nouvelle dépense** : date, description, montant, bénéficiaire, catégorie (pré-remplit le % de remboursement selon la règle fixe ou le prorata annuel), % modifiable, méthode de paiement, notes, photo du reçu (compressée côté client, stockée dans un bucket privé), case « déjà payé ».
- **Détail** : toutes les infos, reçu en grand, « Marquer payé » (créditeur), « Contester » avec commentaire (débiteur), « Modifier » / « Archiver » (créateur, tant que non réglée).
- **Règlement mensuel** : solde net du mois, bouton « Confirmer le règlement » qui marque toutes les dépenses du mois comme payées (réservé au créancier net du mois).
- **Archives** : dépenses payées ou archivées avec les mêmes filtres. Aucune suppression réelle.
- **Export** : CSV (compatible Excel FR) ou PDF (avec résumé par payeur et par catégorie), filtré par année, catégorie et statut.
- **Réglages** : catégories (nom, fixe/prorata, %, actif, ordre, ajout), prorata par année, délai des rappels, profil (nom et courriel de notification).
- **Courriels (Resend)** : nouvelle dépense, dépense modifiée, dépense payée, dépense contestée, règlement mensuel, et rappel automatique quotidien (pg_cron → Edge Function) après X jours sans paiement, journalisé dans `relances` pour ne jamais relancer deux fois dans la même période.

## Choix d'implémentation à connaître

- **Noms de colonnes en ASCII** (`cree_le`, `paye_le`, `envoye_le`, `non_paye`, `conteste`, `archive`…) plutôt qu'avec accents comme dans la spec initiale : évite les problèmes d'encodage avec PostgREST, les types TypeScript et les exports CSV.
- **Notifications d'événements** (nouvelle / modifiée / payée / contestée / règlement) envoyées par les Server Actions Next.js via Resend, directement après l'écriture en base. Les **relances** passent par pg_cron → Edge Function `relances` (service role), comme prévu.
- **Règles de sécurité** appliquées côté base par un trigger `BEFORE UPDATE` (plus fiable que des policies RLS pour comparer ancienne/nouvelle ligne) :
  - seul le créateur modifie une dépense non réglée ;
  - seul le créditeur (payeur) passe le statut à `paye` (et peut l'annuler) ;
  - seul le débiteur passe le statut à `conteste` (commentaire obligatoire) ;
  - seul le créateur archive / remet en cours ; aucune policy `DELETE`.
- **Règlement mensuel** : la fonction SQL `confirmer_reglement_mois` n'accepte que le créancier net du mois (ou n'importe qui si le net est 0), puisque le règlement compense les dépenses des deux sens.
- Les dépenses **contestées** sont exclues du solde et du règlement mensuel tant qu'elles ne sont pas corrigées par leur créateur (ce qui les remet « en cours »).
- Une **dépense personnelle** (bénéficiaire `N/A`) pré-remplit 100 % de remboursement.

## Mise en place

### 1. Supabase

1. Créer un projet Supabase.
2. Appliquer la migration `supabase/migrations/20260920000000_init.sql` (SQL Editor, ou `supabase db push` avec la CLI). Elle crée les tables, les triggers, les policies RLS, le bucket `recus`, la fonction `lancer_relances()` et la tâche pg_cron quotidienne (12:00 UTC).
   > Les extensions `pg_cron` et `pg_net` doivent être activées (Database → Extensions) ; la migration le fait si votre rôle y est autorisé.
3. **Créer les deux comptes** dans Authentication → Users → *Add user* (pas d'inscription publique dans l'app). Renseigner le champ *User Metadata* avec `{"nom": "Martin"}` et `{"nom": "Dominique"}` pour que le profil soit bien nommé (sinon le nom est dérivé du courriel et modifiable dans les Réglages). Le nom sert au calcul du prorata : il doit commencer par « Martin » pour le compte de Martin.
4. Dans l'app, Réglages → **Prorata annuel** : saisir l'année courante (ex. Martin 60 % / Dominique 40 %).
5. **Auth** → URL Configuration : ajouter `https://<votre-domaine>/auth/callback` aux *Redirect URLs* (lien magique). Désactiver *Enable Signups* si vous voulez interdire toute création de compte.

### 2. Edge Function « relances » (rappels automatiques)

```bash
supabase login
supabase link --project-ref <ref>
supabase secrets set RESEND_API_KEY=re_xxx CRON_SECRET=<chaîne-aléatoire-longue> \
  EMAIL_FROM="Dépenses enfants <depenses@servicestmt.ca>" APP_URL=https://<votre-domaine>
supabase functions deploy relances
```

Puis, dans le SQL Editor, stocker l'URL du projet et le secret dans Vault pour que pg_cron puisse appeler la fonction :

```sql
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<le même CRON_SECRET>', 'cron_secret');
-- test manuel :
select public.lancer_relances();
```

Le délai (défaut 14 jours) se règle dans l'app, Réglages → Rappels automatiques.

### 3. Vercel

Variables d'environnement (voir `.env.example`) :

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (publishable) |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app (liens dans les courriels) |
| `RESEND_API_KEY` | Clé Resend (domaine `servicestmt.ca` déjà vérifié) |
| `EMAIL_FROM` | Expéditeur, ex. `Dépenses enfants <depenses@servicestmt.ca>` |

Sans `RESEND_API_KEY`, l'app fonctionne normalement et se contente de journaliser les courriels non envoyés.

### 4. Développement local

```bash
cp .env.example .env.local   # puis remplir
npm install
npm run dev
```

`npm run build` et `npm run lint` doivent passer avant de pousser.

## Structure

```
supabase/
  migrations/20260920000000_init.sql   schéma, triggers, RLS, storage, pg_cron
  functions/relances/index.ts          Edge Function des rappels (Deno)
src/
  proxy.ts                             rafraîchissement de session + redirection vers /login
  lib/supabase/                        clients Supabase (navigateur, serveur, proxy)
  lib/data.ts                          lectures (session, dépenses, catégories, règles…)
  lib/actions/                         Server Actions (auth, dépenses, réglages)
  lib/email.ts                         gabarits et envoi Resend
  lib/calculs.ts                       montant dû, solde net, proportion suggérée
  lib/export.ts                        lignes / CSV d'export
  app/(app)/                           pages authentifiées (accueil, dépenses, règlement, archives, export, réglages)
  app/login, app/auth/callback         connexion (mot de passe ou lien magique)
  app/api/export                       export CSV / JSON
  components/                          UI (formulaire de dépense, cartes, filtres, réglages…)
public/sw.js, public/icons             PWA
```

## Hors scope v1 (idées notées)

- Notifications web push (en plus du courriel)
- Graphiques de dépenses par catégorie / année
