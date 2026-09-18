import { useMemo } from "react";
import { desc, eq, ne } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import type { ProgressPhoto } from "@px/core";
import { db } from "@/db";
import { rowToProgressPhoto } from "@/db/progress-photo-repository";
import { progressPhotos, setLogs } from "@/db/schema";

/*
 * Leituras reativas do SQLite pras telas de fotos e de configurações — mesmo
 * papel do use-workout-data: a consulta mora aqui, a tela só desenha.
 */

export type PendingSync = {
  /** Séries registradas que ainda não subiram. */
  sets: number;
  /** Séries desmarcadas (tombstones) aguardando remoção no backend. */
  removals: number;
  /** Fotos aguardando upload. */
  photos: number;
  allSynced: boolean;
};

/** Contagem ao vivo do que falta sincronizar (a "fila" é a coluna sync_status). */
export function usePendingSync(): PendingSync {
  const { data: unsyncedSets } = useLiveQuery(
    db
      .select({ status: setLogs.syncStatus })
      .from(setLogs)
      .where(ne(setLogs.syncStatus, "synced")),
  );
  const { data: pendingPhotos } = useLiveQuery(
    db
      .select({ id: progressPhotos.id })
      .from(progressPhotos)
      .where(eq(progressPhotos.syncStatus, "pending")),
  );

  return useMemo(() => {
    const sets =
      unsyncedSets?.filter((r) => r.status === "pending").length ?? 0;
    const removals =
      unsyncedSets?.filter((r) => r.status === "deleted").length ?? 0;
    const photos = pendingPhotos?.length ?? 0;
    return { sets, removals, photos, allSynced: sets + removals + photos === 0 };
  }, [unsyncedSets, pendingPhotos]);
}

/** Galeria do usuário, da foto mais nova pra mais velha, direto do aparelho. */
export function useProgressPhotos(userId: string): ProgressPhoto[] {
  const { data } = useLiveQuery(
    db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.userId, userId))
      .orderBy(desc(progressPhotos.takenAt)),
    [userId],
  );
  return useMemo(() => (data ?? []).map(rowToProgressPhoto), [data]);
}
