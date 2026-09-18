import type {
  ConnectivityStatus,
  SetLogRepository,
  WorkoutSyncGateway,
} from "../ports";

export type SyncResult =
  | { status: "offline"; synced: 0; removed: 0 }
  | { status: "nothing-to-sync"; synced: 0; removed: 0 }
  | { status: "synced"; synced: number; removed: number }
  /**
   * Havia rede, mas o backend recusou ou não respondeu. O que não foi
   * confirmado continua pending/tombstone; synced/removed contam o que chegou
   * a ser confirmado antes da falha.
   */
  | { status: "error"; synced: number; removed: number };

/**
 * Empurra os registros de série pendentes pro backend e resolve os
 * tombstones (séries desmarcadas depois de sincronizadas), removendo-os do
 * backend e só então do banco local. Chamado quando o NetInfo detecta conexão
 * de volta e no foreground do app. Se o push falhar, os registros continuam
 * pending — nada se perde — e o resultado "error" diferencia isso de estar
 * offline.
 */
export class SyncPendingSetLogsUseCase {
  constructor(
    private readonly setLogs: SetLogRepository,
    private readonly gateway: WorkoutSyncGateway,
    private readonly connectivity: ConnectivityStatus,
  ) {}

  async execute(): Promise<SyncResult> {
    if (!(await this.connectivity.isOnline())) {
      return { status: "offline", synced: 0, removed: 0 };
    }

    const pending = await this.setLogs.pending();
    const deletedIds = await this.setLogs.deletedIds();
    if (pending.length === 0 && deletedIds.length === 0) {
      return { status: "nothing-to-sync", synced: 0, removed: 0 };
    }

    if (pending.length > 0) {
      try {
        await this.gateway.pushSetLogs(pending);
      } catch {
        return { status: "error", synced: 0, removed: 0 };
      }
      await this.setLogs.markSynced(pending.map((l) => l.id));
    }

    if (deletedIds.length > 0) {
      try {
        await this.gateway.deleteSetLogs(deletedIds);
      } catch {
        return { status: "error", synced: pending.length, removed: 0 };
      }
      await this.setLogs.remove(deletedIds);
    }

    return {
      status: "synced",
      synced: pending.length,
      removed: deletedIds.length,
    };
  }
}
