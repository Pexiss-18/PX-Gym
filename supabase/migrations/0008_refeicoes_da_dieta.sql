-- A dieta passa a trazer opções de refeição, não só as metas: cada refeição
-- tem 2 ou 3 opções com alimentos em gramas e os totais conferidos pela
-- fórmula (ver conferirRefeicoes em _shared/plano/regras.ts). Dietas antigas
-- ficam com a lista vazia.

alter table nutrition_plans
  add column if not exists meals jsonb not null default '[]'::jsonb;

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
    diet_guidance, meals, model, sources
  ) values (
    g.assessment_id, g.user_id, g.id, (p_nutrition->>'caloriesTarget')::int,
    p_nutrition->'macros', p_nutrition->'micros',
    p_nutrition->>'dietGuidance', coalesce(p_nutrition->'meals', '[]'::jsonb),
    p_model, p_sources
  ) returning id into v_nutrition_id;

  update plan_generations
    set status = 'done', model = p_model, error_message = null, finished_at = now()
    where id = g.id;

  return v_nutrition_id;
end;
$$;

revoke all on function complete_nutrition_generation(uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function complete_nutrition_generation(uuid, text, jsonb, jsonb)
  to service_role;
