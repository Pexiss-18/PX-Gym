import { assertEquals, assertRejects } from "@std/assert";
import { ProvedorGemini, provedoresGemini } from "./gemini.ts";
import { ErroDeCota, ErroDoProvedor, gerarComReserva, type ProvedorIA } from "./provedor.ts";

const PEDIDO = { sistema: "s", entrada: "e", esquema: { type: "object" } };

function provedor(modelo: string, gerar: () => Promise<unknown>): ProvedorIA {
  return { modelo, gerar };
}

function buscarFixo(status: number, corpo: unknown): typeof fetch {
  return () => Promise.resolve(Response.json(corpo, { status }));
}

Deno.test("reserva: cota esgotada no primeiro passa pro segundo", async () => {
  const resultado = await gerarComReserva(
    [
      provedor("a", () => Promise.reject(new ErroDeCota("a"))),
      provedor("b", () => Promise.resolve({ ok: true })),
    ],
    PEDIDO,
    (json) => json,
  );
  assertEquals(resultado, { valor: { ok: true }, modelo: "b" });
});

Deno.test("reserva: resposta reprovada na validação conta como falha do modelo", async () => {
  const resultado = await gerarComReserva(
    [
      provedor("a", () => Promise.resolve({ dias: 1 })),
      provedor("b", () => Promise.resolve({ dias: 3 })),
    ],
    PEDIDO,
    (json) => {
      const plano = json as { dias: number };
      if (plano.dias !== 3) throw new Error("dias errados");
      return plano;
    },
  );
  assertEquals(resultado.modelo, "b");
});

Deno.test("reserva: todos sem cota propaga ErroDeCota (pedido vai pra fila)", async () => {
  await assertRejects(
    () =>
      gerarComReserva(
        [
          provedor("a", () => Promise.reject(new ErroDeCota("a"))),
          provedor("b", () => Promise.reject(new ErroDeCota("b"))),
        ],
        PEDIDO,
        (json) => json,
      ),
    ErroDeCota,
  );
});

Deno.test("reserva: falha real prevalece sobre cota", async () => {
  await assertRejects(
    () =>
      gerarComReserva(
        [
          provedor("a", () => Promise.reject(new ErroDoProvedor("quebrou"))),
          provedor("b", () => Promise.reject(new ErroDeCota("b"))),
        ],
        PEDIDO,
        (json) => json,
      ),
    ErroDoProvedor,
    "quebrou",
  );
});

Deno.test("gemini: envia o esquema e lê o texto do passo model_output", async () => {
  const enviados: { url: string; chave: string | null; corpo: Record<string, unknown> }[] = [];
  const buscar: typeof fetch = (url, init) => {
    enviados.push({
      url: String(url),
      chave: new Headers(init?.headers).get("x-goog-api-key"),
      corpo: JSON.parse(String(init?.body)),
    });
    return Promise.resolve(
      Response.json({
        status: "completed",
        steps: [
          { type: "thought", content: [{ type: "text", text: "ignorado" }] },
          {
            type: "model_output",
            content: [{ type: "text", text: '{"a":' }, { type: "text", text: "1}" }],
          },
        ],
      }),
    );
  };

  const json = await new ProvedorGemini("gemini-x", "chave", buscar).gerar(PEDIDO);

  assertEquals(json, { a: 1 });
  assertEquals(enviados.length, 1);
  assertEquals(enviados[0].url, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assertEquals(enviados[0].chave, "chave");
  assertEquals(enviados[0].corpo.model, "gemini-x");
  assertEquals(enviados[0].corpo.system_instruction, "s");
  assertEquals(enviados[0].corpo.store, false);
  assertEquals(enviados[0].corpo.response_format, {
    type: "text",
    mime_type: "application/json",
    schema: { type: "object" },
  });
});

Deno.test("gemini: HTTP 429 vira ErroDeCota", async () => {
  await assertRejects(
    () => new ProvedorGemini("m", "k", buscarFixo(429, { error: { message: "quota" } })).gerar(PEDIDO),
    ErroDeCota,
  );
});

Deno.test("gemini: erro HTTP, status incompleto e JSON quebrado viram ErroDoProvedor", async () => {
  await assertRejects(
    () =>
      new ProvedorGemini("m", "k", buscarFixo(503, { error: { message: "overloaded" } })).gerar(PEDIDO),
    ErroDoProvedor,
    "HTTP 503 overloaded",
  );
  await assertRejects(
    () => new ProvedorGemini("m", "k", buscarFixo(200, { status: "incomplete" })).gerar(PEDIDO),
    ErroDoProvedor,
    "incomplete",
  );
  await assertRejects(
    () =>
      new ProvedorGemini("m", "k", buscarFixo(200, { status: "completed", output_text: "texto solto" }))
        .gerar(PEDIDO),
    ErroDoProvedor,
    "JSON",
  );
  await assertRejects(
    () => new ProvedorGemini("m", "k", () => Promise.reject(new Error("sem rede"))).gerar(PEDIDO),
    ErroDoProvedor,
    "sem rede",
  );
});

Deno.test("gemini: GEMINI_MODELS troca a cadeia; vazio usa a padrão", () => {
  assertEquals(provedoresGemini("k").map((p) => p.modelo), [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
  ]);
  assertEquals(provedoresGemini("k", " a , b ,").map((p) => p.modelo), ["a", "b"]);
});
