import {
  RegisterSetUseCase,
  SyncPendingSetLogsUseCase,
  UnregisterSetUseCase,
  type SyncResult,
} from "@px/core";
import { SupabaseWorkoutSyncGateway } from "@px/db";
import { db } from "@/db";
import { DrizzleSetLogRepository } from "@/db/set-log-repository";
import { supabase } from "./supabase";
import { cryptoIds, netInfoConnectivity, systemClock } from "./system";

/*
 * Composition root do treino: instancia os use cases do @px/core com os
 * adapters concretos (SQLite local, Supabase remoto, NetInfo).
 */

export const setLogRepository = new DrizzleSetLogRepository(db);

export const registerSetUseCase = new RegisterSetUseCase(
  setLogRepository,
  systemClock,
  cryptoIds,
);

export const unregisterSetUseCase = new UnregisterSetUseCase(setLogRepository);

export function syncUseCaseFor(userId: string): SyncPendingSetLogsUseCase {
  return new SyncPendingSetLogsUseCase(
    setLogRepository,
    new SupabaseWorkoutSyncGateway(supabase, userId),
    netInfoConnectivity,
  );
}

/**
 * Dispara um sync sem propagar falha — offline ou erro de rede deixam os
 * registros pending pra próxima tentativa (foreground/reconexão).
 */
export async function trySyncSetLogs(userId: string): Promise<SyncResult> {
  try {
    return await syncUseCaseFor(userId).execute();
  } catch {
    return { status: "offline", synced: 0, removed: 0 };
  }
}

/** Dia da sessão no fuso do aparelho (mesmo formato usado pelo RegisterSet). */
export function todayIsoDate(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
