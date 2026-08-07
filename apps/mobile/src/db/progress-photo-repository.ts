import { desc, eq } from "drizzle-orm";
import { ProgressPhoto, type ProgressPhotoRepository } from "@px/core";
import type { Db } from "./index";
import { progressPhotos, type ProgressPhotoLocalRow } from "./schema";

function toEntity(row: ProgressPhotoLocalRow): ProgressPhoto {
  return ProgressPhoto.restore({
    id: row.id,
    userId: row.userId,
    localUri: row.localUri,
    remotePath: row.remotePath,
    takenAt: row.takenAt,
    note: row.note,
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
      syncStatus: photo.syncStatus,
    });
  }

  async pendingUpload(): Promise<ProgressPhoto[]> {
    const rows = await this.db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.syncStatus, "pending"))
      .orderBy(progressPhotos.takenAt);
    return rows.map(toEntity);
  }

  async markUploaded(id: string, remotePath: string): Promise<void> {
    await this.db
      .update(progressPhotos)
      .set({ remotePath, syncStatus: "synced" })
      .where(eq(progressPhotos.id, id));
  }

  async listByUser(userId: string): Promise<ProgressPhoto[]> {
    const rows = await this.db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.userId, userId))
      .orderBy(desc(progressPhotos.takenAt));
    return rows.map(toEntity);
  }
}
