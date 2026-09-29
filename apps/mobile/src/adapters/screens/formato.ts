import type { CicloLeitura, StatusCiclo, StatusSincronizacao } from "@px/core";
import type { Tom } from "./ui";

/** "2026-09-02" → "02/09/2026" (sem passar por Date: nada de fuso). */
export function dataBr(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** 2.5 → "2,5h" */
export function horas(h: number): string {
  return `${String(Math.round(h * 100) / 100).replace(".", ",")}h`;
}

export const TOM_STATUS: Record<StatusCiclo, Tom> = {
  em_andamento: "neutro",
  aguardando_aprovacao: "ambar",
  aprovado: "volt",
  devolvido: "coral",
};

export const ROTULO_SYNC: Record<StatusSincronizacao, string> = {
  pending: "no aparelho",
  synced: "na nuvem",
  error: "falhou — vai tentar de novo",
};

/** Quantos itens do relatório ainda não chegaram na nuvem. */
export function pendentesDeEnvio(c: CicloLeitura): number {
  const status = [
    ...c.atividades.map((a) => a.statusSincronizacao),
    ...c.assinaturas.map((a) => a.statusSincronizacao),
    ...(c.avaliacaoPersonal ? [c.avaliacaoPersonal.statusSincronizacao] : []),
    ...(c.autoAvaliacao ? [c.autoAvaliacao.statusSincronizacao] : []),
  ];
  return status.filter((s) => s !== "synced").length;
}

/** Converte "1,5" / "1.5" / "2" em número; NaN se não for número. */
export function lerHoras(texto: string): number {
  const limpo = texto.trim().replace(",", ".");
  return limpo === "" ? NaN : Number(limpo);
}

export function hojeIso(agora = new Date()): string {
  const mm = String(agora.getMonth() + 1).padStart(2, "0");
  const dd = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mm}-${dd}`;
}
