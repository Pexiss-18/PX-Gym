import { InvalidValueError } from "../errors";

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
/** Menos que isso é um toque acidental no quadro, não uma assinatura. */
const MINIMO_CARACTERES = 24;
const PREFIXO_DATA_URI = /^data:image\/(svg\+xml|png);base64,/;

/**
 * Assinatura digital desenhada na tela: a imagem em base64 e o instante em
 * que foi feita. Aceita base64 puro ou data URI (SVG/PNG).
 */
export class Assinatura {
  private constructor(
    readonly base64: string,
    readonly timestamp: Date,
  ) {
    Object.freeze(this);
  }

  static criar(conteudo: string, timestamp: Date): Assinatura {
    const base64 = conteudo.trim().replace(PREFIXO_DATA_URI, "");
    if (base64.length < MINIMO_CARACTERES) {
      throw new InvalidValueError("Assinatura vazia ou curta demais.");
    }
    if (base64.length % 4 !== 0 || !BASE64.test(base64)) {
      throw new InvalidValueError("A assinatura não está em base64.");
    }
    if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
      throw new InvalidValueError("Marca temporal inválida.");
    }
    return new Assinatura(base64, new Date(timestamp.getTime()));
  }

  /** Pronto pra <Image source={{ uri }} /> ou pro PDF. */
  get dataUri(): string {
    return `data:image/svg+xml;base64,${this.base64}`;
  }

  equals(outra: Assinatura): boolean {
    return (
      this.base64 === outra.base64 &&
      this.timestamp.getTime() === outra.timestamp.getTime()
    );
  }
}
