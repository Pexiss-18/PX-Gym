-- Fotos de progresso corporal (offline-first: gravadas no aparelho e enviadas
-- pro bucket quando há conexão; a linha aqui espelha o registro local).
create table if not exists progress_photos (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  storage_path text not null,
  taken_at timestamptz not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists progress_photos_user_taken_idx
  on progress_photos (user_id, taken_at desc);

alter table progress_photos enable row level security;

create policy "progress_photos_select_own" on progress_photos
  for select using (auth.uid() = user_id);
create policy "progress_photos_insert_own" on progress_photos
  for insert with check (auth.uid() = user_id);
create policy "progress_photos_update_own" on progress_photos
  for update using (auth.uid() = user_id);
create policy "progress_photos_delete_own" on progress_photos
  for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "progress_photos_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'progress-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "progress_photos_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'progress-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "progress_photos_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'progress-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
  );
