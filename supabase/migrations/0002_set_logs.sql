-- Registros de série vindos do mobile (offline-first: o app grava no SQLite
-- local e faz upsert aqui quando a conexão volta; id é gerado no cliente).
create table if not exists set_logs (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  session_date date not null,
  exercise_id text not null,
  exercise_name text not null,
  set_number int not null,
  target_reps int not null,
  previous_load_kg numeric(6, 2) not null,
  load_kg numeric(6, 2) not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists set_logs_user_session_idx
  on set_logs (user_id, session_date desc);
create index if not exists set_logs_user_exercise_idx
  on set_logs (user_id, exercise_id, completed_at desc);

alter table set_logs enable row level security;

create policy "set_logs_select_own" on set_logs
  for select using (auth.uid() = user_id);
create policy "set_logs_insert_own" on set_logs
  for insert with check (auth.uid() = user_id);
create policy "set_logs_update_own" on set_logs
  for update using (auth.uid() = user_id);
create policy "set_logs_delete_own" on set_logs
  for delete using (auth.uid() = user_id);
