-- Trava de custo das fotos no Cloudflare R2. O R2 não tem teto de gastos:
-- passou do gratuito (10 GB), ele cobra. Então quem limita é a Edge Function
-- photo-storage, que só assina um envio depois de reservar o espaço aqui.
--
-- Cada linha é a reserva de um objeto no R2, com o tamanho declarado (que
-- entra na assinatura do PUT, então o R2 não aceita arquivo maior). Reserva
-- de envio que falhou continua contando: a soma é um teto, nunca menos que
-- o uso real — errar pra cima é o que garante não pagar.
--
-- Sem FK pra auth.users de propósito: se a conta for apagada, os objetos
-- continuam no R2 até alguém limpar, e a reserva precisa continuar contando.
create table if not exists photo_storage_reservations (
  photo_id uuid primary key,
  user_id uuid not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create index if not exists photo_storage_reservations_user_idx
  on photo_storage_reservations (user_id);

-- Só a service_role (a Edge Function) mexe aqui: RLS ligado e sem policies.
alter table photo_storage_reservations enable row level security;

-- Reserva espaço pra uma foto, tudo ou nada. Reenviar a mesma foto troca o
-- tamanho em vez de somar. O advisory lock serializa as reservas: dois envios
-- ao mesmo tempo não conseguem passar juntos do limite.
-- Devolve { status: 'ok' | 'user_quota' | 'global_quota', global_bytes },
-- com o total reservado depois da tentativa (pro aviso de 80% ao admin).
create or replace function reserve_photo_storage(
  p_photo_id uuid,
  p_user_id uuid,
  p_size bigint,
  p_user_cap bigint,
  p_global_cap bigint
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_user_total bigint;
  v_global_total bigint;
begin
  perform pg_advisory_xact_lock(hashtext('photo_storage_reservations'));

  if exists (
    select 1 from photo_storage_reservations
    where photo_id = p_photo_id and user_id <> p_user_id
  ) then
    raise exception 'photo % pertence a outro usuário', p_photo_id;
  end if;

  select coalesce(sum(size_bytes), 0) into v_global_total
    from photo_storage_reservations where photo_id <> p_photo_id;
  select coalesce(sum(size_bytes), 0) into v_user_total
    from photo_storage_reservations
    where user_id = p_user_id and photo_id <> p_photo_id;

  if v_global_total + p_size > p_global_cap then
    return jsonb_build_object('status', 'global_quota', 'global_bytes', v_global_total);
  end if;
  if v_user_total + p_size > p_user_cap then
    return jsonb_build_object('status', 'user_quota', 'global_bytes', v_global_total);
  end if;

  insert into photo_storage_reservations (photo_id, user_id, size_bytes)
  values (p_photo_id, p_user_id, p_size)
  on conflict (photo_id) do update set size_bytes = excluded.size_bytes;

  return jsonb_build_object('status', 'ok', 'global_bytes', v_global_total + p_size);
end;
$$;

revoke all on function reserve_photo_storage(uuid, uuid, bigint, bigint, bigint)
  from public, anon, authenticated;
grant execute on function reserve_photo_storage(uuid, uuid, bigint, bigint, bigint)
  to service_role;

-- Avisos pro administrador (ntfy), no máximo um de cada tipo por intervalo:
-- a nuvem cheia recusa todo envio, e sem isso cada recusa viraria um push.
create table if not exists admin_alerts (
  kind text primary key,
  last_sent_at timestamptz not null
);

alter table admin_alerts enable row level security;

-- true = pode mandar agora (e já marca como mandado); false = mandou há pouco.
create or replace function claim_admin_alert(p_kind text, p_interval interval)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  insert into admin_alerts (kind, last_sent_at) values (p_kind, now())
  on conflict (kind) do update set last_sent_at = now()
    where admin_alerts.last_sent_at < now() - p_interval;
  return found;
end;
$$;

revoke all on function claim_admin_alert(text, interval)
  from public, anon, authenticated;
grant execute on function claim_admin_alert(text, interval) to service_role;
