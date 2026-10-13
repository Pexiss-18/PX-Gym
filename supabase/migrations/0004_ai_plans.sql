-- Planos gerados por IA a partir de uma avaliação corporal revisada: a Edge
-- Function generate-plan lê o perfil (user_profiles) e grava o pedido
-- (plan_generations), a dieta (nutrition_plans, já existente) e o treino
-- (workout_plans).

-- O que o usuário responde uma vez e a IA reaproveita em todo plano. As duas
-- listas de preferência também são alimentadas pelos pedidos de mudança
-- ("não tem leg press na minha academia", "não gosto de ovo").
create table if not exists user_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  sex text not null check (sex in ('masculino', 'feminino')),
  birth_date date not null,
  height_cm numeric(5, 1) not null check (height_cm between 120 and 230),
  goal text not null
    check (goal in ('hipertrofia', 'emagrecimento', 'forca', 'condicionamento', 'saude')),
  level text not null check (level in ('iniciante', 'intermediario', 'avancado')),
  days_per_week int not null check (days_per_week between 2 and 6),
  minutes_per_session int not null default 60
    check (minutes_per_session between 20 and 120),
  -- lesões e limitações, em texto livre
  restrictions text not null default '',
  -- regiões com dor ou lesão ('ombro', 'lombar', 'joelho', 'cotovelo',
  -- 'punho'): os exercícios do catálogo que as sobrecarregam ficam de fora
  sensitive_regions text[] not null default '{}',
  -- ids do catálogo de exercícios que a academia do usuário não tem
  unavailable_exercises text[] not null default '{}',
  disliked_foods text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "user_profiles_select_own" on user_profiles
  for select using (auth.uid() = user_id);
create policy "user_profiles_insert_own" on user_profiles
  for insert with check (auth.uid() = user_id);
create policy "user_profiles_update_own" on user_profiles
  for update using (auth.uid() = user_id);

-- Um pedido de geração. É a fila ('queued' = a cota da IA acabou, tenta
-- depois) e a base do limite por usuário, então só o servidor escreve aqui.
create table if not exists plan_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  assessment_id uuid not null references body_assessments on delete cascade,
  status text not null default 'generating'
    check (status in ('queued', 'generating', 'done', 'error')),
  -- 'revision' = o usuário pediu pra mudar algo no plano anterior
  kind text not null default 'initial' check (kind in ('initial', 'revision')),
  -- o pedido de mudança, nas palavras do usuário
  feedback text,
  -- o perfil como estava na hora do pedido
  profile jsonb not null,
  model text,
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists plan_generations_user_idx
  on plan_generations (user_id, created_at desc);
create index if not exists plan_generations_assessment_idx
  on plan_generations (assessment_id);

alter table plan_generations enable row level security;

create policy "plan_generations_select_own" on plan_generations
  for select using (auth.uid() = user_id);

-- Plano de treino semanal. `days` guarda os dias com os exercícios (ids do
-- catálogo fechado, os mesmos de set_logs.exercise_id); o app lê o plano
-- inteiro de uma vez, então não há tabela por dia/exercício.
create table if not exists workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  assessment_id uuid not null references body_assessments on delete cascade,
  generation_id uuid references plan_generations on delete set null,
  name text not null,
  rationale text not null,
  days jsonb not null,
  -- ids dos artigos do acervo que embasaram o plano
  sources jsonb not null default '[]',
  model text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists workout_plans_user_idx
  on workout_plans (user_id, created_at desc);
create unique index if not exists workout_plans_one_active_idx
  on workout_plans (user_id) where active;

alter table workout_plans enable row level security;

create policy "workout_plans_select_own" on workout_plans
  for select using (auth.uid() = user_id);

alter table nutrition_plans
  add column if not exists generation_id uuid references plan_generations on delete set null,
  add column if not exists sources jsonb not null default '[]';

-- Fecha um pedido de geração: grava dieta e treino, desativa o treino
-- anterior e marca o pedido como concluído, tudo ou nada.
create or replace function complete_plan_generation(
  p_generation_id uuid,
  p_model text,
  p_nutrition jsonb,
  p_workout jsonb,
  p_sources jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  g plan_generations;
  v_nutrition_id uuid;
  v_workout_id uuid;
begin
  select * into g from plan_generations where id = p_generation_id for update;
  if not found then
    raise exception 'plan_generation % not found', p_generation_id;
  end if;

  update workout_plans set active = false where user_id = g.user_id and active;

  insert into nutrition_plans (
    assessment_id, user_id, generation_id, calories_target, macros, micros,
    diet_guidance, model, sources
  ) values (
    g.assessment_id, g.user_id, g.id, (p_nutrition->>'caloriesTarget')::int,
    p_nutrition->'macros', p_nutrition->'micros',
    p_nutrition->>'dietGuidance', p_model, p_sources
  ) returning id into v_nutrition_id;

  insert into workout_plans (
    user_id, assessment_id, generation_id, name, rationale, days, sources, model
  ) values (
    g.user_id, g.assessment_id, g.id, p_workout->>'name',
    p_workout->>'rationale', p_workout->'days', p_sources, p_model
  ) returning id into v_workout_id;

  update plan_generations
    set status = 'done', model = p_model, error_message = null, finished_at = now()
    where id = g.id;

  return jsonb_build_object(
    'nutritionPlanId', v_nutrition_id,
    'workoutPlanId', v_workout_id
  );
end;
$$;

revoke all on function complete_plan_generation(uuid, text, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function complete_plan_generation(uuid, text, jsonb, jsonb, jsonb)
  to service_role;
