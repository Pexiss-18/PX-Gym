-- Treino e dieta passam a ser gerados em pedidos separados: cada um tem o
-- seu botão no app, os seus pedidos de mudança e os seus limites.

-- De que parte é o pedido. 'both' fica para os pedidos antigos, de quando
-- treino e dieta saíam juntos.
alter table plan_generations
  add column if not exists part text not null default 'both'
    check (part in ('both', 'workout', 'nutrition'));

create index if not exists plan_generations_assessment_part_idx
  on plan_generations (assessment_id, part, kind);

-- A dieta ganha a noção de "ativa", como o treino. Sem índice único: o web
-- e o @px/db inserem dietas sem conhecer a coluna, então a dieta atual é a
-- ativa mais recente.
alter table nutrition_plans
  add column if not exists active boolean not null default true;

update nutrition_plans n
  set active = false
  where exists (
    select 1 from nutrition_plans newer
    where newer.user_id = n.user_id and newer.created_at > n.created_at
  );

create index if not exists nutrition_plans_active_idx
  on nutrition_plans (user_id, created_at desc) where active;

-- A função antiga (treino e dieta juntos) continua, mas agora também
-- desativa a dieta anterior.
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
  update nutrition_plans set active = false where user_id = g.user_id and active;

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

-- Fecha um pedido de treino: desativa o treino anterior e grava o novo.
create or replace function complete_workout_generation(
  p_generation_id uuid,
  p_model text,
  p_workout jsonb,
  p_sources jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  g plan_generations;
  v_workout_id uuid;
begin
  select * into g from plan_generations where id = p_generation_id for update;
  if not found then
    raise exception 'plan_generation % not found', p_generation_id;
  end if;
  if g.part <> 'workout' then
    raise exception 'plan_generation % is not a workout request', p_generation_id;
  end if;

  update workout_plans set active = false where user_id = g.user_id and active;

  insert into workout_plans (
    user_id, assessment_id, generation_id, name, rationale, days, sources, model
  ) values (
    g.user_id, g.assessment_id, g.id, p_workout->>'name',
    p_workout->>'rationale', p_workout->'days', p_sources, p_model
  ) returning id into v_workout_id;

  update plan_generations
    set status = 'done', model = p_model, error_message = null, finished_at = now()
    where id = g.id;

  return v_workout_id;
end;
$$;

-- Fecha um pedido de dieta: desativa a dieta anterior e grava a nova.
create or replace function complete_nutrition_generation(
  p_generation_id uuid,
  p_model text,
  p_nutrition jsonb,
  p_sources jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  g plan_generations;
  v_nutrition_id uuid;
begin
  select * into g from plan_generations where id = p_generation_id for update;
  if not found then
    raise exception 'plan_generation % not found', p_generation_id;
  end if;
  if g.part <> 'nutrition' then
    raise exception 'plan_generation % is not a nutrition request', p_generation_id;
  end if;

  update nutrition_plans set active = false where user_id = g.user_id and active;

  insert into nutrition_plans (
    assessment_id, user_id, generation_id, calories_target, macros, micros,
    diet_guidance, model, sources
  ) values (
    g.assessment_id, g.user_id, g.id, (p_nutrition->>'caloriesTarget')::int,
    p_nutrition->'macros', p_nutrition->'micros',
    p_nutrition->>'dietGuidance', p_model, p_sources
  ) returning id into v_nutrition_id;

  update plan_generations
    set status = 'done', model = p_model, error_message = null, finished_at = now()
    where id = g.id;

  return v_nutrition_id;
end;
$$;

revoke all on function complete_workout_generation(uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function complete_workout_generation(uuid, text, jsonb, jsonb)
  to service_role;

revoke all on function complete_nutrition_generation(uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function complete_nutrition_generation(uuid, text, jsonb, jsonb)
  to service_role;
