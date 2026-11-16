import type { BodyAssessment } from "@px/core";
import type { PxSupabaseClient } from "../client";
import { SupabaseAssessmentRepository } from "../repositories/assessments";

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
