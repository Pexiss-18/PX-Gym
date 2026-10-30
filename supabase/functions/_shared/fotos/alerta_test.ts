import { assert, assertEquals } from "@std/assert";
import { alertaPara, enviarNtfy } from "./alerta.ts";

const GB = 1024 * 1024 * 1024;
const LIMITE = 9 * GB;
const POR_USUARIO = 300 * 1024 * 1024;

Deno.test("abaixo de 80%: sem aviso", () => {
  assertEquals(alertaPara("ok", 7 * GB, LIMITE, POR_USUARIO), null);
});

Deno.test("passou de 80%: aviso alto, ainda aceitando", () => {
  const a = alertaPara("ok", 7.3 * GB, LIMITE, POR_USUARIO)!;
  assertEquals(a.tipo, "fotos-global-80");
  assertEquals(a.prioridade, "high");
  assert(a.mensagem.includes("7,30 GB de 9,00 GB"));
});

Deno.test("cheia: urgente", () => {
  const a = alertaPara("global_quota", 9 * GB, LIMITE, POR_USUARIO)!;
  assertEquals(a.tipo, "fotos-global-cheio");
  assertEquals(a.prioridade, "urgent");
});

Deno.test("cota de um usuário: aviso normal, sem identificar a pessoa", () => {
  const a = alertaPara("user_quota", 2 * GB, LIMITE, POR_USUARIO)!;
  assertEquals(a.tipo, "fotos-usuario-cheio");
  assert(a.mensagem.includes("300 MB"));
});

Deno.test("ntfy: POST no tópico com título codificado e prioridade", async () => {
  const pedidos: Request[] = [];
  const ok = await enviarNtfy(
    "px-segredo",
    alertaPara("global_quota", 9 * GB, LIMITE, POR_USUARIO)!,
    (input, init) => {
      pedidos.push(new Request(input as string, init));
      return Promise.resolve(new Response("{}", { status: 200 }));
    },
  );
  assert(ok);
  assertEquals(pedidos[0]!.url, "https://ntfy.sh/px-segredo");
  assertEquals(pedidos[0]!.headers.get("priority"), "urgent");
  assert(pedidos[0]!.headers.get("title")!.startsWith("=?UTF-8?B?"));
  assert((await pedidos[0]!.text()).includes("recusados"));
});

Deno.test("ntfy fora do ar: devolve false, não lança", async () => {
  const ok = await enviarNtfy(
    "t",
    alertaPara("global_quota", 1, 1, 1)!,
    () => Promise.reject(new Error("rede")),
  );
  assertEquals(ok, false);
});
