import { ErroDeCota, ErroDoProvedor, type PedidoIA, type ProvedorIA } from "./provedor.ts";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const TEMPO_LIMITE_MS = 90_000;

type Interacao = {
  status?: string;
  output_text?: string;
  steps?: { type?: string; content?: { type?: string; text?: string }[] }[];
  error?: { message?: string };
};

function textoDaResposta(interacao: Interacao): string {
  if (typeof interacao.output_text === "string") return interacao.output_text;
  return (interacao.steps ?? [])
    .filter((passo) => passo.type === "model_output")
    .flatMap((passo) => passo.content ?? [])
    .filter((parte) => parte.type === "text" && typeof parte.text === "string")
    .map((parte) => parte.text)
    .join("");
}

/** Gemini pela Interactions API do AI Studio (chave sem faturamento). */
export class ProvedorGemini implements ProvedorIA {
  constructor(
    readonly modelo: string,
    private readonly chave: string,
    private readonly buscar: typeof fetch = fetch,
  ) {}

  async gerar(pedido: PedidoIA): Promise<unknown> {
    let resposta: Response;
    try {
      resposta = await this.buscar(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.chave },
        body: JSON.stringify({
          model: this.modelo,
          system_instruction: pedido.sistema,
          input: pedido.entrada,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: pedido.esquema,
          },
          // Avaliação corporal é dado de saúde: não fica guardada no Google.
          store: false,
        }),
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      });
    } catch (erro) {
      throw new ErroDoProvedor(`${this.modelo}: ${erro instanceof Error ? erro.message : erro}`);
    }

    if (resposta.status === 429) throw new ErroDeCota(this.modelo);

    const corpo = (await resposta.json().catch(() => ({}))) as Interacao;
    if (!resposta.ok) {
      throw new ErroDoProvedor(
        `${this.modelo}: HTTP ${resposta.status} ${corpo.error?.message ?? ""}`.trim(),
      );
    }
    if (corpo.status && corpo.status !== "completed") {
      throw new ErroDoProvedor(`${this.modelo}: resposta ${corpo.status}`);
    }

    const texto = textoDaResposta(corpo);
    try {
      return JSON.parse(texto);
    } catch {
      throw new ErroDoProvedor(`${this.modelo}: a resposta não é um JSON válido`);
    }
  }
}

/**
 * Cadeia padrão: os dois Flash-Lite têm cota diária própria no plano
 * gratuito (500 pedidos/dia cada), então o segundo é a reserva do primeiro.
 * GEMINI_MODELS (lista separada por vírgula) troca a ordem sem novo deploy.
 */
export const MODELOS_PADRAO = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

export function provedoresGemini(chave: string, modelos?: string | null): ProvedorIA[] {
  const lista = (modelos ?? "")
    .split(",")
    .map((modelo) => modelo.trim())
    .filter(Boolean);
  return (lista.length > 0 ? lista : MODELOS_PADRAO).map(
    (modelo) => new ProvedorGemini(modelo, chave),
  );
}
