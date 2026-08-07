import type { SetLog, WorkoutSyncGateway } from "@px/core";
import type { PxSupabaseClient } from "../client";
import { toSetLogRow } from "../mappers";

/**
 * Implementação Supabase do WorkoutSyncGateway: recebe os SetLogs pendentes
 * do SQLite local e faz upsert na tabela set_logs (migration 0002).
 * Upsert por id torna o push idempotente — re-sincronizar não duplica.
 */
export class SupabaseWorkoutSyncGateway implements WorkoutSyncGateway {
  constructor(
    private readonly client: PxSupabaseClient,
    private readonly userId: string,
  ) {}

  async pushSetLogs(logs: SetLog[]): Promise<void> {
    if (logs.length === 0) return;
    const rows = logs.map((l) => toSetLogRow(l, this.userId));
    const { error } = await this.client
      .from("set_logs")
      .upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  async deleteSetLogs(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.client
      .from("set_logs")
      .delete()
      .in("id", ids)
      .eq("user_id", this.userId);
    if (error) throw error;
  }
}
