import type { ExtractedAssessment } from "@px/core";

/** Medidas mais comuns numa avaliação com personal; todas opcionais. */
export const MEDIDAS = ["Peito", "Cintura", "Abdômen", "Quadril", "Braço", "Coxa", "Panturrilha"];

/** Outros nomes que os laudos usam pra mesma medida. */
const SINONIMOS: Record<string, string> = {
  torax: "Peito",
  abdome: "Abdômen",
  abdomen: "Abdômen",
  bracos: "Braço",
  antebraco: "",
};

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** "Braço direito relaxado" → "Braço"; "Tórax" → "Peito"; sem par → null. */
export function medidaDoFormulario(rotulo: string): string | null {
  const palavras = normalizar(rotulo).split(/\s+/);
  const primeira = palavras[0] ?? "";
  if (primeira in SINONIMOS) return SINONIMOS[primeira] || null;
  return MEDIDAS.find((m) => normalizar(m) === primeira) ?? null;
}

/** 81.4 → "81,4"; null → "". */
export const paraCampo = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

export type FormularioDaAvaliacao = {
  peso: string;
  gordura: string;
  musculo: string;
  /** AAAA-MM-DD ou "" (hoje). */
  data: string;
  observacoes: string;
  medidas: Record<string, string>;
  /** Medidas do laudo sem par na lista padrão, na ordem em que vieram. */
  extras: string[];
};

/**
 * O que a IA leu do PDF, pronto pros campos do formulário. A primeira
 * medida de cada tipo ocupa o campo padrão ("Braço direito" → Braço); as
 * outras ("Braço esquerdo") viram linhas extras com o nome do laudo.
 */
export function formularioDoPdf(lido: ExtractedAssessment): FormularioDaAvaliacao {
  const medidas: Record<string, string> = {};
  const extras: string[] = [];
  for (const { label, valueCm } of lido.measurements) {
    const campo = medidaDoFormulario(label);
    const destino = campo && !(campo in medidas) ? campo : label;
    if (destino in medidas) continue;
    medidas[destino] = paraCampo(valueCm);
    if (!MEDIDAS.includes(destino)) extras.push(destino);
  }
  return {
    peso: paraCampo(lido.weightKg),
    gordura: paraCampo(lido.bodyFatPct),
    musculo: paraCampo(lido.muscleMassKg),
    data: lido.assessmentDate ?? "",
    observacoes: lido.notes ?? "",
    medidas,
    extras,
  };
}
