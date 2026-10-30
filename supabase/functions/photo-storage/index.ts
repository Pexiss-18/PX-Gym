import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { z } from "zod";
import { type Alerta, alertaPara, enviarNtfy } from "../_shared/fotos/alerta.ts";
import {
  chaveDaFoto,
  configDoAmbiente,
  FotosR2,
  LIMITE_GLOBAL,
  LIMITE_POR_USUARIO,
  type Reserva,
  TAMANHO_MAXIMO,
} from "../_shared/fotos/r2.ts";

const corpoSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("upload"),
    photoId: z.uuid(),
    size: z.number().int().positive(),
  }),
  z.object({ action: z.literal("download"), photoId: z.uuid() }),
  z.object({ action: z.literal("delete"), photoId: z.uuid() }),
]);

function falha(status: number, error: string, code?: string): Response {
  return Response.json({ error, code }, { status });
}

type ClienteAdmin = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown }>;
};

/**
 * Push pro administrador via ntfy (tópico no secret NTFY_TOPIC), no máximo
 * um de cada tipo por dia. Sem o secret, só fica no log da função.
 */
async function avisarAdmin(admin: ClienteAdmin, alerta: Alerta): Promise<void> {
  const topico = Deno.env.get("NTFY_TOPIC");
  if (!topico) {
    console.warn(`[photo-storage] ${alerta.titulo} (NTFY_TOPIC não configurado)`);
    return;
  }
  const { data: pode } = await admin.rpc("claim_admin_alert", {
    p_kind: alerta.tipo,
    p_interval: "1 day",
  });
  if (pode === true) await enviarNtfy(topico, alerta);
}

/**
 * POST /photo-storage — porteiro das fotos de progresso no R2.
 *   { action: "upload", photoId, size } → { url, headers, path } (PUT, 5 min)
 *   { action: "download", photoId }     → { url }                (GET, 5 min)
 *   { action: "delete", photoId }       → { ok: true }
 *
 * A chave é sempre {userId do JWT}/{photoId}.jpg: o usuário só alcança a
 * própria pasta. A linha em progress_photos continua sendo gravada pelo app
 * direto no Postgres (RLS).
 *
 * Trava de custo: antes de assinar um envio, o espaço é reservado em
 * photo_storage_reservations (migration 0005). Bucket ou cota do usuário
 * cheios → 507 { code: "global_quota" | "user_quota" } e nada é assinado;
 * a foto fica pending no aparelho, sem aviso pra pessoa. Quem fica sabendo
 * é o admin, por push no ntfy (a partir de 80% e quando enche).
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return falha(405, "Use POST.");

    const config = configDoAmbiente((nome) => Deno.env.get(nome));
    if (!config) return falha(500, "R2 não configurado no servidor.");

    const corpo = corpoSchema.safeParse(await req.json().catch(() => null));
    if (!corpo.success) return falha(400, "Dados do pedido inválidos.");
    const pedido = corpo.data;

    const r2 = new FotosR2(config);
    const userId = ctx.userClaims!.id;
    const chave = chaveDaFoto(userId, pedido.photoId);
    const admin = ctx.supabaseAdmin;

    switch (pedido.action) {
      case "upload": {
        if (pedido.size > TAMANHO_MAXIMO) {
          return falha(413, "Foto maior que o permitido.");
        }
        const { data: reserva, error } = await admin.rpc("reserve_photo_storage", {
          p_photo_id: pedido.photoId,
          p_user_id: userId,
          p_size: pedido.size,
          p_user_cap: LIMITE_POR_USUARIO,
          p_global_cap: LIMITE_GLOBAL,
        });
        if (error) return falha(500, "Não deu pra reservar espaço agora.");
        const { status, global_bytes } = reserva as {
          status: Reserva;
          global_bytes: number;
        };

        const alerta = alertaPara(status, global_bytes, LIMITE_GLOBAL, LIMITE_POR_USUARIO);
        if (alerta) await avisarAdmin(admin, alerta);

        // code: o app só usa pra parar de tentar; a pessoa não vê aviso nenhum
        if (status !== "ok") {
          return falha(507, "Armazenamento de fotos na nuvem cheio.", status);
        }
        const envio = await r2.urlDeEnvio(chave, pedido.size);
        return Response.json({ ...envio, path: chave });
      }
      case "download":
        return Response.json({ url: await r2.urlDeDownload(chave) });
      case "delete": {
        // Reserva só sai depois que o R2 confirmou: na dúvida, continua contando.
        await r2.apagar(chave);
        const { error } = await admin
          .from("photo_storage_reservations")
          .delete()
          .eq("photo_id", pedido.photoId)
          .eq("user_id", userId);
        if (error) return falha(500, "Foto apagada, mas a reserva não foi liberada.");
        return Response.json({ ok: true });
      }
    }
  }),
};
