create table if not exists body_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  pdf_path text not null,
  status text not null default 'processing'
    check (status in ('processing', 'pending_review', 'reviewed', 'error')),
  extracted_data jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references body_assessments on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  calories_target int not null,
  macros jsonb not null,
  micros jsonb not null,
  diet_guidance text not null,
  model text not null,
  created_at timestamptz not null default now()
);

create index if not exists body_assessments_user_id_idx on body_assessments (user_id, created_at desc);
create index if not exists nutrition_plans_assessment_id_idx on nutrition_plans (assessment_id);
create index if not exists nutrition_plans_user_id_idx on nutrition_plans (user_id, created_at desc);

alter table body_assessments enable row level security;
alter table nutrition_plans enable row level security;

create policy "body_assessments_select_own" on body_assessments
  for select using (auth.uid() = user_id);
create policy "body_assessments_insert_own" on body_assessments
  for insert with check (auth.uid() = user_id);
create policy "body_assessments_update_own" on body_assessments
  for update using (auth.uid() = user_id);
create policy "body_assessments_delete_own" on body_assessments
  for delete using (auth.uid() = user_id);

create policy "nutrition_plans_select_own" on nutrition_plans
  for select using (auth.uid() = user_id);
create policy "nutrition_plans_insert_own" on nutrition_plans
  for insert with check (auth.uid() = user_id);
create policy "nutrition_plans_delete_own" on nutrition_plans
  for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('assessments', 'assessments', false)
on conflict (id) do nothing;

create policy "assessments_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'assessments' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "assessments_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'assessments' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "assessments_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'assessments' and (storage.foldername(name))[1] = auth.uid()::text
  );
