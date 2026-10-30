import { assert, assertEquals, assertRejects } from "@std/assert";
import { chaveDaFoto, configDoAmbiente, FotosR2 } from "./r2.ts";

const CONFIG = {
  accountId: "conta123",
  accessKeyId: "AKID",
  secretAccessKey: "segredo",
  bucket: "px-fotos",
};

function respondendo(status: number, pedidos: Request[] = []): typeof fetch {
  return (input) => {
    pedidos.push(input as Request);
    return Promise.resolve(new Response(null, { status }));
  };
}

Deno.test("chave: sempre na pasta do usuário", () => {
  assertEquals(chaveDaFoto("u1", "p1"), "u1/p1.jpg");
});

Deno.test("config: falta qualquer variável → null", () => {
  const env: Record<string, string> = {
    R2_ACCOUNT_ID: "a",
    R2_ACCESS_KEY_ID: "b",
    R2_SECRET_ACCESS_KEY: "c",
    R2_BUCKET: "d",
  };
  assertEquals(configDoAmbiente((n) => env[n])?.bucket, "d");
  delete env.R2_BUCKET;
  assertEquals(configDoAmbiente((n) => env[n]), null);
});

Deno.test("envio: URL assinada presa ao tamanho e ao tipo, 5 min", async () => {
  const { url, headers } = await new FotosR2(CONFIG).urlDeEnvio("u1/p1.jpg", 412345);
  const u = new URL(url);

  assertEquals(u.host, "conta123.r2.cloudflarestorage.com");
  assertEquals(u.pathname, "/px-fotos/u1/p1.jpg");
  assertEquals(u.searchParams.get("X-Amz-Expires"), "300");
  assertEquals(
    u.searchParams.get("X-Amz-SignedHeaders"),
    "content-length;content-type;host",
  );
  assert(u.searchParams.get("X-Amz-Signature"));
  assertEquals(headers, { "content-type": "image/jpeg", "content-length": "412345" });
});

Deno.test("envio: tamanhos diferentes geram assinaturas diferentes", async () => {
  const r2 = new FotosR2(CONFIG);
  const a = new URL((await r2.urlDeEnvio("u1/p1.jpg", 100)).url);
  const b = new URL((await r2.urlDeEnvio("u1/p1.jpg", 101)).url);
  assert(a.searchParams.get("X-Amz-Signature") !== b.searchParams.get("X-Amz-Signature"));
});

Deno.test("download: GET assinado só com host", async () => {
  const u = new URL(await new FotosR2(CONFIG).urlDeDownload("u1/p1.jpg"));
  assertEquals(u.pathname, "/px-fotos/u1/p1.jpg");
  assertEquals(u.searchParams.get("X-Amz-SignedHeaders"), "host");
});

Deno.test("apagar: DELETE assinado; 204 e 404 contam como apagado", async () => {
  const pedidos: Request[] = [];
  await new FotosR2(CONFIG, respondendo(204, pedidos)).apagar("u1/p1.jpg");
  await new FotosR2(CONFIG, respondendo(404, pedidos)).apagar("u1/p1.jpg");

  assertEquals(pedidos[0]!.method, "DELETE");
  assertEquals(new URL(pedidos[0]!.url).pathname, "/px-fotos/u1/p1.jpg");
  assert(pedidos[0]!.headers.get("authorization")?.startsWith("AWS4-HMAC-SHA256"));
});

Deno.test("apagar: erro do R2 propaga (o tombstone tenta de novo)", async () => {
  await assertRejects(() => new FotosR2(CONFIG, respondendo(500)).apagar("u1/p1.jpg"));
});
