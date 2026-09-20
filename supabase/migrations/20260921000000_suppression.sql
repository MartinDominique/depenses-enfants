-- Suppression définitive d'une dépense : autorisée uniquement à son créateur.
-- (Les relances liées sont supprimées en cascade.)
drop policy if exists "depenses suppression" on public.depenses;
create policy "depenses suppression" on public.depenses
  for delete to authenticated using (cree_par_id = auth.uid());

-- Suppression du reçu dans le bucket "recus" (fichiers rangés par <user_id>/...).
drop policy if exists "recus suppression" on storage.objects;
create policy "recus suppression" on storage.objects
  for delete to authenticated using (bucket_id = 'recus' and split_part(name, '/', 1) = auth.uid()::text);
