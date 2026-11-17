import type {
  AssessmentPdfReader,
  ConnectivityStatus,
  PdfAssessmentReading,
} from "../../domain/contracts";
import { falha, falhaDoErro, sucesso, type Resultado } from "./resultado";

/** Mesmo teto do envio pelo web. */
export const PDF_MAX_BYTES = 15 * 1024 * 1024;

/** Todo PDF começa com "%PDF". */
function pareceUmPdf(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

/**
 * Lê o PDF da avaliação com a IA e devolve os números pra pessoa conferir
 * no formulário (nada é salvo como avaliação aqui). Confere no aparelho o
 * que dá — internet, tamanho, se é PDF — antes de subir o arquivo.
 */
export class ReadAssessmentPdfUseCase {
  constructor(
    private readonly reader: AssessmentPdfReader,
    private readonly connectivity: ConnectivityStatus,
  ) {}

  async execute(userId: string, pdf: Uint8Array): Promise<Resultado<PdfAssessmentReading>> {
    if (!pareceUmPdf(pdf)) return falha("dados-invalidos", "Escolha um arquivo PDF.");
    if (pdf.length > PDF_MAX_BYTES) return falha("dados-invalidos", "O PDF passa de 15 MB.");
    try {
      if (!(await this.connectivity.isOnline())) {
        return falha("falha-externa", "Sem internet agora. Ler o PDF precisa de conexão.");
      }
      return sucesso(await this.reader.read(userId, pdf));
    } catch (erro) {
      return falhaDoErro(erro);
    }
  }
}
