import { Load, SetLog } from "@px/core";
import type { PxSupabaseClient } from "../client";
import { SupabaseWorkoutSyncGateway } from "../repositories/workout-sync";

type Call = { table: string; op: string; args: unknown[] };

/**
 * Client falso só com a superfície que o gateway usa: from().upsert() e
 * from().delete().in().eq(). Registra as chamadas e devolve `error` se pedido.
 */
function fakeClient(error: { message: string } | null = null) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      return {
        async upsert(...args: unknown[]) {
          calls.push({ table, op: "upsert", args });
          return { error };
        },
        delete() {
          const filters: unknown[] = [];
          const chain = {
            in(...args: unknown[]) {
              filters.push(["in", ...args]);
              return chain;
            },
            eq(...args: unknown[]) {
              filters.push(["eq", ...args]);
              calls.push({ table, op: "delete", args: filters });
              return Promise.resolve({ error });
            },
          };
          return chain;
        },
      };
    },
  };
  return { calls, client: client as unknown as PxSupabaseClient };
}

const log = SetLog.create({
  id: "8f7a2c1e-0000-4000-8000-000000000001",
  sessionDate: "2026-09-11",
  exerciseId: "supino",
  exerciseName: "Supino reto",
  setNumber: 1,
  targetReps: 8,
  previousLoad: Load.fromKg(60),
  load: Load.fromKg(62.5),
  completedAt: new Date("2026-09-11T19:00:00.000Z"),
});

describe("SupabaseWorkoutSyncGateway", () => {
  it("faz upsert por id com o user_id da sessão (push idempotente)", async () => {
    const { calls, client } = fakeClient();

    await new SupabaseWorkoutSyncGateway(client, "user-1").pushSetLogs([log]);

    expect(calls).toEqual([
      {
        table: "set_logs",
        op: "upsert",
        args: [
          [
            {
              id: log.id,
              user_id: "user-1",
              session_date: "2026-09-11",
              exercise_id: "supino",
              exercise_name: "Supino reto",
              set_number: 1,
              target_reps: 8,
              previous_load_kg: 60,
              load_kg: 62.5,
              completed_at: "2026-09-11T19:00:00.000Z",
            },
          ],
          { onConflict: "id" },
        ],
      },
    ]);
  });

  it("não chama a rede com lote vazio", async () => {
    const { calls, client } = fakeClient();
    const gateway = new SupabaseWorkoutSyncGateway(client, "user-1");

    await gateway.pushSetLogs([]);
    await gateway.deleteSetLogs([]);

    expect(calls).toHaveLength(0);
  });

  it("delete filtra pelos ids E pelo dono (defesa além da RLS)", async () => {
    const { calls, client } = fakeClient();

    await new SupabaseWorkoutSyncGateway(client, "user-1").deleteSetLogs([
      "a",
      "b",
    ]);

    expect(calls).toEqual([
      {
        table: "set_logs",
        op: "delete",
        args: [
          ["in", "id", ["a", "b"]],
          ["eq", "user_id", "user-1"],
        ],
      },
    ]);
  });

  it("erro do Supabase vira exceção — o use case decide que é 'error'", async () => {
    const { client } = fakeClient({ message: "JWT expired" });
    const gateway = new SupabaseWorkoutSyncGateway(client, "user-1");

    await expect(gateway.pushSetLogs([log])).rejects.toEqual({
      message: "JWT expired",
    });
    await expect(gateway.deleteSetLogs(["a"])).rejects.toEqual({
      message: "JWT expired",
    });
  });
});
