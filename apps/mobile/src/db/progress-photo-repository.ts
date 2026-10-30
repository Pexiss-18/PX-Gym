import { and, desc, eq, ne } from "drizzle-orm";
import { ProgressPhoto, type ProgressPhotoRepository } from "@px/core";
import type { Db } from "./index";
import { progressPhotos, type ProgressPhotoLocalRow } from "./schema";

/** Linha do SQLite → entidade do domínio. Exportado pros hooks de useLiveQuery. */
export function rowToProgressPhoto(row: ProgressPhotoLocalRow): ProgressPhoto {
  return ProgressPhoto.restore({
    id: row.id,
    userId: row.userId,
    localUri: row.localUri,
    remotePath: row.remotePath,
    takenAt: row.takenAt,
    note: row.note,
    location:
      row.latitude !== null && row.longitude !== null
        ? { latitude: row.latitude, longitude: row.longitude }
        : null,
    syncStatus: row.syncStatus,
  });
}

/** Implementação SQLite/Drizzle do port ProgressPhotoRepository. */
export class DrizzleProgressPhotoRepository implements ProgressPhotoRepository {
  constructor(private readonly db: Db) {}

  async save(photo: ProgressPhoto): Promise<void> {
    await this.db.insert(progressPhotos).values({
      id: photo.id,
      userId: photo.userId,
      localUri: photo.localUri,
      remotePath: photo.remotePath,
      takenAt: photo.takenAt,
      note: photo.note,
      latitude: photo.location?.latitude ?? null,
      longitude: photo.location?.longitude ?? null,
      syncStatus: photo.syncStatus,
    });
  }

  async pendingUpload(): Promise<ProgressPhoto[]> {
    const rows = await this.db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.syncStatus, "pending"))
      .orderBy(progressPhotos.takenAt);
    return rows.map(rowToProgressPhoto);
  }

  async markUploaded(id: string, remotePath: string): Promise<void> {
    await this.db
      .update(progressPhotos)
      .set({ remotePath, syncStatus: "synced" })
      .where(eq(progressPhotos.id, id));
  }

  async byId(id: string): Promise<ProgressPhoto | null> {
    const [row] = await this.db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.id, id));
    return row ? rowToProgressPhoto(row) : null;
  }

  async listByUser(userId: string): Promise<ProgressPhoto[]> {
    const rows = await this.db
      .select()
      .from(progressPhotos)
      .where(
        and(
          eq(progressPhotos.userId, userId),
          ne(progressPhotos.syncStatus, "deleted"),
        ),
      )
      .orderBy(desc(progressPhotos.takenAt));
    return rows.map(rowToProgressPhoto);
  }

  async knownIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: progressPhotos.id })
      .from(progressPhotos)
      .where(eq(progressPhotos.userId, userId));
    return rows.map((r) => r.id);
  }

  async markDeleted(id: string): Promise<void> {
    await this.db
      .update(progressPhotos)
      .set({ syncStatus: "deleted" })
      .where(eq(progressPhotos.id, id));
  }

  async pendingDeletion(): Promise<ProgressPhoto[]> {
    const rows = await this.db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.syncStatus, "deleted"));
    return rows.map(rowToProgressPhoto);
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(progressPhotos).where(eq(progressPhotos.id, id));
  }
}
