import type { Reserva } from "./r2.ts";

/**
 * Avisos pro administrador quando a nuvem de fotos aperta. Vão pelo ntfy
 * (push no celular, sem conta): só quem sabe o nome do tópico recebe.
 * Quem usa o app não vê nada disso — a foto só fica "aguardando envio".
 */

/** A partir daqui o admin já fica sabendo, antes de travar de vez. */
export const AVISO_EM = 0.8;

export type Alerta = {
  /** Um aviso de cada tipo por dia (claim_admin_alert, migration 0005). */
  tipo: "fotos-global-80" | "fotos-global-cheio" | "fotos-usuario-cheio";
  titulo: string;
  mensagem: string;
  prioridade: "default" | "high" | "urgent";
};

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

function gb(bytes: number): string {
  return `${(bytes / GB).toFixed(2).replace(".", ",")} GB`;
}

export function alertaPara(
  reserva: Reserva,
  usoGlobal: number,
  limiteGlobal: number,
  limitePorUsuario: number,
): Alerta | null {
  if (reserva === "global_quota") {
    return {
      tipo: "fotos-global-cheio",
      titulo: "Px GYM: nuvem de fotos CHEIA",
      mensagem: `${gb(usoGlobal)} de ${gb(limiteGlobal)} reservados. Envios de fotos estão sendo recusados — elas ficam só nos aparelhos até liberar espaço ou subir o limite.`,
      prioridade: "urgent",
    };
  }
  if (reserva === "user_quota") {
    return {
      tipo: "fotos-usuario-cheio",
      titulo: "Px GYM: usuário bateu a cota de fotos",
      mensagem: `Um usuário chegou aos ${limitePorUsuario / MB} MB de fotos na nuvem; as novas dele ficam só no aparelho. Uso total: ${gb(usoGlobal)} de ${gb(limiteGlobal)}.`,
      prioridade: "default",
    };
  }
  if (usoGlobal >= limiteGlobal * AVISO_EM) {
    return {
      tipo: "fotos-global-80",
      titulo: "Px GYM: nuvem de fotos passou de 80%",
      mensagem: `${gb(usoGlobal)} de ${gb(limiteGlobal)} reservados. Ainda aceita envios, mas está chegando no limite do gratuito do R2.`,
      prioridade: "high",
    };
  }
  return null;
}

/** Header HTTP só aceita latin-1: título com acento vai em RFC 2047, que o ntfy entende. */
function cabecalhoUtf8(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  return `=?UTF-8?B?${btoa(String.fromCharCode(...bytes))}?=`;
}

/** POST no tópico do ntfy. Nunca lança: aviso falhando não pode travar o envio da foto. */
export async function enviarNtfy(
  topico: string,
  alerta: Alerta,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetcher(`https://ntfy.sh/${encodeURIComponent(topico)}`, {
      method: "POST",
      body: alerta.mensagem,
      headers: {
        Title: cabecalhoUtf8(alerta.titulo),
        Priority: alerta.prioridade,
        Tags: alerta.prioridade === "default" ? "warning" : "rotating_light",
      },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
