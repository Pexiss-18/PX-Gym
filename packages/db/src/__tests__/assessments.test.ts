import { BusinessRuleError, type BodyAssessment } from "@px/core";
import type { PxSupabaseClient } from "../client";
import { SupabaseAssessmentPdfReader, SupabaseAssessmentRepository } from "../repositories/assessments";

/** Client falso só com o insert → select → single que o createManual usa. */
function fakeClient(opts: { error?: unknown } = {}) {
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  const client = {
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          inserts.push({ table, row });
          return {
            select: () => ({
              single: async () =>
                opts.error
                  ? { data: null, error: opts.error }
                  : { data: { error_message: null, ...row }, error: null },
            }),
          };
        },
      };
    },
  };
  return { client: client as unknown as PxSupabaseClient, inserts };
}

const MANUAL: BodyAssessment = {
  id: "a-1",
  userId: "user-1",
  pdfPath: null,
  source: "manual",
  status: "reviewed",
  extracted: {
    weightKg: 70,
    bodyFatPct: 18,
    muscleMassKg: null,
    measurements: [{ label: "Cintura", valueCm: 80 }],
    assessmentDate: "2026-11-10",
    notes: null,
  },
  errorMessage: null,
  createdAt: new Date("2026-11-10T14:00:00Z"),
};

describe("SupabaseAssessmentRepository.createManual", () => {
  it("grava sem PDF, revisada e com origem manual", async () => {
    const { client, inserts } = fakeClient();

    const salva = await new SupabaseAssessmentRepository(client).createManual(MANUAL);

    expect(inserts).toEqual([
      {
        table: "body_assessments",
        row: {
          id: "a-1",
          user_id: "user-1",
          pdf_path: null,
          source: "manual",
          status: "reviewed",
          extracted_data: MANUAL.extracted,
          created_at: "2026-11-10T14:00:00.000Z",
        },
      },
    ]);
    expect(salva).toEqual(MANUAL);
  });

  it("erro do Supabase sobe pro caso de uso", async () => {
    const { client } = fakeClient({ error: { message: "violates row-level security" } });

    await expect(new SupabaseAssessmentRepository(client).createManual(MANUAL)).rejects.toEqual({
      message: "violates row-level security",
    });
  });
});

describe("SupabaseAssessmentRepository.createManual com PDF", () => {
  it("grava o caminho do PDF e a origem pdf", async () => {
    const { client, inserts } = fakeClient();
    await new SupabaseAssessmentRepository(client).createManual({ ...MANUAL, pdfPath: "user-1/x.pdf", source: "pdf" });
    expect(inserts[0]?.row).toMatchObject({ pdf_path: "user-1/x.pdf", source: "pdf", status: "reviewed" });
  });
});

describe("SupabaseAssessmentPdfReader", () => {
  const LIDA = {
    weightKg: 81.4, bodyFatPct: 18.7, muscleMassKg: 36.8,
    measurements: [], assessmentDate: "2026-11-12", notes: null,
  };

  function clientDoPdf(opts: { invoke?: { data?: unknown; error?: unknown }; uploadError?: unknown } = {}) {
    const uploads: { bucket: string; path: string; contentType?: string }[] = [];
    const invokes: { name: string; body: unknown }[] = [];
    const client = {
      storage: {
        from: (bucket: string) => ({
          async upload(path: string, _bytes: Uint8Array, o: { contentType?: string }) {
            uploads.push({ bucket, path, contentType: o.contentType });
            return { data: null, error: opts.uploadError ?? null };
          },
        }),
      },
      functions: {
        async invoke(name: string, o: { body: unknown }) {
          invokes.push({ name, body: o.body });
          return { data: opts.invoke?.data ?? null, error: opts.invoke?.error ?? null };
        },
      },
    };
    return { client: client as unknown as PxSupabaseClient, uploads, invokes };
  }

  it("sobe na pasta do usuário e pede a leitura com o caminho", async () => {
    const { client, uploads, invokes } = clientDoPdf({ invoke: { data: { assessment: LIDA } } });

    const r = await new SupabaseAssessmentPdfReader(client, () => "id-9").read("user-1", new Uint8Array([1]));

    expect(uploads).toEqual([{ bucket: "assessments", path: "user-1/id-9.pdf", contentType: "application/pdf" }]);
    expect(invokes).toEqual([{ name: "extract-assessment", body: { pdfPath: "user-1/id-9.pdf" } }]);
    expect(r).toEqual({ pdfPath: "user-1/id-9.pdf", extracted: LIDA });
  });

  it("recusa da função (4xx) vira regra de negócio com a mensagem dela", async () => {
    const respostaDoServidor = { status: 422, json: async () => ({ error: "Esse PDF não parece uma avaliação corporal." }) };
    const { client } = clientDoPdf({ invoke: { error: { context: respostaDoServidor } } });

    const leitura = new SupabaseAssessmentPdfReader(client, () => "id-9").read("user-1", new Uint8Array([1]));

    await expect(leitura).rejects.toBeInstanceOf(BusinessRuleError);
    await expect(leitura).rejects.toThrow("não parece uma avaliação");
  });

  it("falha no envio não chama a IA", async () => {
    const { client, invokes } = clientDoPdf({ uploadError: new Error("sem rede") });
    await expect(new SupabaseAssessmentPdfReader(client, () => "id").read("user-1", new Uint8Array([1]))).rejects.toThrow("sem rede");
    expect(invokes).toHaveLength(0);
  });
});
