import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import type { ProvedorIA } from "../ia/provedor.ts";
import { conferirLeitura, extrairAvaliacao, type Leitura, PdfSemAvaliacao } from "./extrair.ts";

const LEITURA: Leitura = {
  isBodyAssessment: true,
  weightKg: 81.4,
  bodyFatPct: 18.7,
  muscleMassKg: 36.8,
  measurements: [
    { label: " Cintura ", valueCm: 86.5 },
    { label: "Tórax", valueCm: 101 },
  ],
  assessmentDate: "2026-11-12",
  notes: "Em jejum.",
};

Deno.test("leitura válida passa inteira, com rótulos limpos", () => {
  const lida = conferirLeitura(LEITURA, "2026-11-16");
  assertEquals(lida, {
    weightKg: 81.4,
    bodyFatPct: 18.7,
    muscleMassKg: 36.8,
    measurements: [
      { label: "Cintura", valueCm: 86.5 },
      { label: "Tórax", valueCm: 101 },
    ],
    assessmentDate: "2026-11-12",
    notes: "Em jejum.",
  });
});

Deno.test("PDF que não é avaliação, ou sem peso, é recusado", () => {
  assertThrows(
    () => conferirLeitura({ ...LEITURA, isBodyAssessment: false }, "2026-11-16"),
    PdfSemAvaliacao,
    "não parece",
  );
  assertThrows(() => conferirLeitura({ ...LEITURA, weightKg: null }, "2026-11-16"), PdfSemAvaliacao, "peso");
});

Deno.test("valores implausíveis viram null e medidas absurdas saem; a pessoa completa", () => {
  const lida = conferirLeitura(
    {
      ...LEITURA,
      bodyFatPct: 187, // vírgula perdida
      muscleMassKg: 90, // maior que o peso
      measurements: [{ label: "Cintura", valueCm: 865 }, { label: "", valueCm: 40 }],
      assessmentDate: "2027-01-01",
    },
    "2026-11-16",
  );
  assertEquals(lida.bodyFatPct, null);
  assertEquals(lida.muscleMassKg, null);
  assertEquals(lida.measurements, []);
  assertEquals(lida.assessmentDate, null);
});

Deno.test("extrairAvaliacao manda o PDF como anexo e cai pro reserva se a resposta vier quebrada", async () => {
  const pedidos: unknown[] = [];
  const provedores: ProvedorIA[] = [
    { modelo: "principal", gerar: () => Promise.resolve({ lixo: true }) },
    {
      modelo: "reserva",
      gerar: (pedido) => {
        pedidos.push(pedido.anexos);
        return Promise.resolve(LEITURA);
      },
    },
  ];

  const { avaliacao, modelo } = await extrairAvaliacao(provedores, "JVBERi0=", "2026-11-16");

  assertEquals(modelo, "reserva");
  assertEquals(avaliacao.weightKg, 81.4);
  assertEquals(pedidos, [[{ mimeType: "application/pdf", base64: "JVBERi0=" }]]);
});

Deno.test("extrairAvaliacao: documento que não é avaliação propaga PdfSemAvaliacao", async () => {
  const provedores: ProvedorIA[] = [
    { modelo: "m", gerar: () => Promise.resolve({ ...LEITURA, isBodyAssessment: false }) },
  ];
  await assertRejects(() => extrairAvaliacao(provedores, "x", "2026-11-16"), PdfSemAvaliacao);
});
