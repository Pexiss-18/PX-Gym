import type { SetLogRepository } from "../ports";

/**
 * Desfaz o registro de uma série (check desmarcado durante o treino).
 * Se o registro ainda é pending, some direto do banco local; se já foi
 * sincronizado, vira tombstone ("deleted") pro sync remover do backend na
 * próxima janela — assim desmarcar offline não deixa órfão no Supabase.
 */
export class UnregisterSetUseCase {
  constructor(private readonly setLogs: SetLogRepository) {}

  async execute(input: { logId: string }): Promise<void> {
    const log = await this.setLogs.byId(input.logId);
    if (!log) return;

    if (log.syncStatus === "pending") {
      await this.setLogs.remove([log.id]);
    } else if (log.syncStatus === "synced") {
      await this.setLogs.markDeleted([log.id]);
    }
    // "deleted": já é tombstone, o sync resolve.
  }
}
