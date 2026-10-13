/**
 * Contrato de um provedor de IA. A função generate-plan só conhece isto:
 * trocar de modelo ou de empresa é escrever outro adapter (ver gemini.ts).
 */
export type PedidoIA = {
  /** Instruções fixas (papel, regras, acervo científico). */
  sistema: string;
  /** Os dados do pedido. */
  entrada: string;
  /** JSON Schema que a resposta precisa seguir. */
  esquema: Record<string, unknown>;
};

export interface ProvedorIA {
  /** Identificador gravado junto do plano (ex.: "gemini-3.5-flash-lite"). */
  readonly modelo: string;
  /** Devolve o JSON já parseado; lança ErroDeCota ou ErroDoProvedor. */
  gerar(pedido: PedidoIA): Promise<unknown>;
}

/** O provedor recusou por limite de uso (HTTP 429): vale tentar o próximo. */
export class ErroDeCota extends Error {
  constructor(modelo: string) {
    super(`Cota esgotada em ${modelo}`);
    this.name = "ErroDeCota";
  }
}

/** Falha do provedor ou resposta fora do formato. */
export class ErroDoProvedor extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDoProvedor";
  }
}

/**
 * Tenta os provedores em ordem até um devolver uma resposta que passe em
 * `validar`. Se todos falharem só por cota, propaga ErroDeCota (o pedido
 * pode ir pra fila); senão propaga a última falha real.
 */
export async function gerarComReserva<T>(
  provedores: ProvedorIA[],
  pedido: PedidoIA,
  validar: (json: unknown) => T,
): Promise<{ valor: T; modelo: string }> {
  let ultimaFalha: unknown = null;
  let ultimaCota: ErroDeCota | null = null;

  for (const provedor of provedores) {
    try {
      const json = await provedor.gerar(pedido);
      return { valor: validar(json), modelo: provedor.modelo };
    } catch (erro) {
      if (erro instanceof ErroDeCota) ultimaCota = erro;
      else ultimaFalha = erro;
    }
  }

  if (ultimaFalha) throw ultimaFalha;
  if (ultimaCota) throw ultimaCota;
  throw new ErroDoProvedor("Nenhum provedor de IA configurado");
}
