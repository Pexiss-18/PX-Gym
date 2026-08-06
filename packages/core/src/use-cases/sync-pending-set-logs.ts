import type {
  ConnectivityStatus,
  SetLogRepository,
  WorkoutSyncGateway,
} from "../ports";

export type SyncResult =
  | { status: "offline"; synced: 0 }
  | { status: "nothing-to-sync"; synced: 0 }
  | { status: "synced"; synced: number };

/**
 * Empurra os registros de série pendentes pro backend. Chamado quando o
 * NetInfo detecta conexão de volta e no foreground do app. Se o push falhar,
 * os registros continuam pending — nada se perde.
 */
export class SyncPendingSetLogsUseCase {
  constructor(
    private readonly setLogs: SetLogRepository,
    private readonly gateway: WorkoutSyncGateway,
    private readonly connectivity: ConnectivityStatus,
  ) {}

  async execute(): Promise<SyncResult> {
    if (!(await this.connectivity.isOnline())) {
      return { status: "offline", synced: 0 };
    }

    const pending = await this.setLogs.pending();
    if (pending.length === 0) {
      return { status: "nothing-to-sync", synced: 0 };
    }

    await this.gateway.pushSetLogs(pending);
    await this.setLogs.markSynced(pending.map((l) => l.id));

    return { status: "synced", synced: pending.length };
  }
}
