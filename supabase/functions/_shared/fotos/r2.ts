import { AwsClient } from "aws4fetch";

/**
 * Fotos de progresso no Cloudflare R2 (API compatível com S3). As chaves de
 * acesso ficam só aqui no servidor: o app recebe URLs assinadas de vida
 * curta e manda/baixa os bytes direto do R2 — nada passa pelo Supabase, e o
 * R2 não cobra tráfego de saída.
 */

const MiB = 1024 * 1024;

/** Teto por foto: o app gera ~0,3–0,5 MB (1080×1920, JPEG 92%). */
export const TAMANHO_MAXIMO = 2 * MiB;
/**
 * Teto do bucket inteiro, abaixo dos 10 GB gratuitos do R2: a cobrança é
 * por GB-mês e o R2 não tem limite de gastos, então a margem fica aqui.
 */
export const LIMITE_GLOBAL = 9 * 1024 * MiB;
/** Teto por usuário, pra ninguém ocupar a nuvem dos outros sozinho. */
export const LIMITE_POR_USUARIO = 300 * MiB;

export type Reserva = "ok" | "user_quota" | "global_quota";
/** Vida das URLs: só precisam durar o envio ou o download. */
export const VALIDADE_SEGUNDOS = 300;

export type ConfigR2 = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export function configDoAmbiente(
  ler: (nome: string) => string | undefined,
): ConfigR2 | null {
  const accountId = ler("R2_ACCOUNT_ID");
  const accessKeyId = ler("R2_ACCESS_KEY_ID");
  const secretAccessKey = ler("R2_SECRET_ACCESS_KEY");
  const bucket = ler("R2_BUCKET");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/**
 * Chave do objeto: {userId}/{photoId}.jpg. Montada só aqui, com o userId do
 * JWT — é isso que impede alguém de ler ou apagar a pasta de outro usuário.
 */
export function chaveDaFoto(userId: string, photoId: string): string {
  return `${userId}/${photoId}.jpg`;
}

export class FotosR2 {
  private readonly aws: AwsClient;

  constructor(
    private readonly config: ConfigR2,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.aws = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: "s3",
      region: "auto",
    });
  }

  private url(chave: string): URL {
    return new URL(
      `https://${this.config.accountId}.r2.cloudflarestorage.com/${this.config.bucket}/${chave}`,
    );
  }

  private async assinar(
    chave: string,
    method: "GET" | "PUT",
    headers: Record<string, string> = {},
  ): Promise<string> {
    const url = this.url(chave);
    url.searchParams.set("X-Amz-Expires", String(VALIDADE_SEGUNDOS));
    const assinado = await this.aws.sign(url, {
      method,
      headers,
      // allHeaders: tipo e tamanho entram na assinatura — se o app mandar
      // outro tamanho ou outro tipo, o R2 recusa o PUT.
      aws: { signQuery: true, allHeaders: true },
    });
    return assinado.url;
  }

  /**
   * URL de envio presa ao tamanho declarado e a image/jpeg. Os headers
   * devolvidos são exatamente os que o app precisa mandar.
   */
  async urlDeEnvio(chave: string, tamanho: number) {
    const headers = {
      "content-type": "image/jpeg",
      "content-length": String(tamanho),
    };
    return { url: await this.assinar(chave, "PUT", headers), headers };
  }

  urlDeDownload(chave: string): Promise<string> {
    return this.assinar(chave, "GET");
  }

  /** Idempotente: o R2 responde 204 mesmo se o objeto já não existir. */
  async apagar(chave: string): Promise<void> {
    const req = await this.aws.sign(this.url(chave), { method: "DELETE" });
    const res = await this.fetcher(req);
    if (!res.ok && res.status !== 404) {
      throw new Error(`R2 respondeu ${res.status} ao apagar ${chave}`);
    }
  }
}
