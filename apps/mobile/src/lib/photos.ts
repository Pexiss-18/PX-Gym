import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";
import {
  SaveProgressPhotoUseCase,
  SyncPendingPhotosUseCase,
  type PhotoSyncResult,
  type ProgressPhoto,
  type ProgressPhotoUploader,
} from "@px/core";
import { BUCKETS } from "@px/db";
import { db } from "@/db";
import { DrizzleProgressPhotoRepository } from "@/db/progress-photo-repository";
import { supabase } from "./supabase";
import { cryptoIds, netInfoConnectivity, systemClock } from "./system";

/*
 * Composition root das fotos de progresso: arquivo no diretório de documentos
 * do app, registro no SQLite (pending) e upload pro bucket quando há rede.
 */

/** Sobe o binário pro bucket e espelha a linha na tabela remota (idempotente). */
class SupabaseProgressPhotoUploader implements ProgressPhotoUploader {
  async upload(photo: ProgressPhoto): Promise<string> {
    const path = `${photo.userId}/${photo.id}.jpg`;

    const bytes = await new File(photo.localUri).bytes();
    const { error } = await supabase.storage
      .from(BUCKETS.progressPhotos)
      .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;

    const { error: rowError } = await supabase.from("progress_photos").upsert(
      {
        id: photo.id,
        user_id: photo.userId,
        storage_path: path,
        taken_at: photo.takenAt.toISOString(),
        note: photo.note,
      },
      { onConflict: "id" },
    );
    if (rowError) throw rowError;

    return path;
  }
}

export const progressPhotoRepository = new DrizzleProgressPhotoRepository(db);

const uploader = new SupabaseProgressPhotoUploader();

export const saveProgressPhotoUseCase = new SaveProgressPhotoUseCase(
  progressPhotoRepository,
  uploader,
  netInfoConnectivity,
  systemClock,
  cryptoIds,
);

const syncPendingPhotosUseCase = new SyncPendingPhotosUseCase(
  progressPhotoRepository,
  uploader,
  netInfoConnectivity,
);

/**
 * Reenvia fotos pendentes sem propagar falha (mesmo contrato do sync de
 * séries). null = a rodada nem começou (erro inesperado, ex.: SQLite).
 */
export async function trySyncPhotos(): Promise<PhotoSyncResult | null> {
  try {
    return await syncPendingPhotosUseCase.execute();
  } catch {
    return null;
  }
}

/**
 * Move a captura do cache da câmera pro diretório permanente do app.
 * O cache pode ser limpo pelo sistema; o documento não.
 */
export function persistCapture(cacheUri: string): string {
  const dir = new Directory(Paths.document, "progress-photos");
  if (!dir.exists) dir.create();
  const dest = new File(dir, `${Crypto.randomUUID()}.jpg`);
  new File(cacheUri).move(dest);
  return dest.uri;
}
