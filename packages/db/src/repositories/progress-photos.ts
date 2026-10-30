import {
  CloudStorageFullError,
  type ProgressPhoto,
  type RemoteProgressPhoto,
} from "@px/core";
import type { PxSupabaseClient } from "../client";
import type { ProgressPhotoRow } from "../types";

/** URL assinada de envio pro R2 e os headers que precisam ir junto. */
export type PhotoUploadTarget = {
  url: string;
  headers: Record<string, string>;
  /** Chave do objeto no R2 ({userId}/{photoId}.jpg). */
  path: string;
};

type PhotoStorageRequest =
  | { action: "upload"; photoId: string; size: number }
  | { action: "download"; photoId: string }
  | { action: "delete"; photoId: string };

/**
 * 507 da photo-storage = sem espaço (trava de custo do R2). Vira erro do
 * domínio pra o sync parar de tentar (quem é avisado é o admin, pelo ntfy,
 * direto da função; a pessoa não vê nada). O resto
 * passa como veio. `context` é a Response do FunctionsHttpError.
 */
async function translate(error: unknown): Promise<unknown> {
  const response = (error as { context?: unknown }).context;
  if (!(response instanceof Response) || response.status !== 507) return error;
  const body = (await response.json().catch(() => null)) as { code?: string } | null;
  return new CloudStorageFullError(body?.code === "user_quota" ? "user" : "global");
}

/**
 * Lado nuvem das fotos de progresso: o arquivo mora no Cloudflare R2 e a
 * linha na tabela progress_photos do Postgres (migration 0003). As chaves do
 * R2 ficam na Edge Function photo-storage, que devolve URLs assinadas — os
 * bytes vão e voltam direto entre o aparelho e o R2. Não mexe em arquivo
 * local: isso é do adapter do mobile. A posição da foto nunca passa por aqui.
 */
export class SupabaseProgressPhotoStore {
  constructor(private readonly client: PxSupabaseClient) {}

  private async storage<T>(body: PhotoStorageRequest): Promise<T> {
    const { data, error } = await this.client.functions.invoke<T>(
      "photo-storage",
      { body },
    );
    if (error) throw await translate(error);
    if (data === null) throw new Error("photo-storage respondeu vazio");
    return data;
  }

  /** Pede a URL de envio; o servidor recusa foto acima de 2 MB. */
  uploadTarget(photoId: string, size: number): Promise<PhotoUploadTarget> {
    return this.storage({ action: "upload", photoId, size });
  }

  /** Espelha a linha depois do envio (upsert: reenviar não duplica). */
  async saveRow(photo: ProgressPhoto, path: string): Promise<void> {
    const { error } = await this.client.from("progress_photos").upsert(
      {
        id: photo.id,
        user_id: photo.userId,
        storage_path: path,
        taken_at: photo.takenAt.toISOString(),
        note: photo.note,
      },
      { onConflict: "id" },
    );
    if (error) throw error;
  }

  async list(userId: string): Promise<RemoteProgressPhoto[]> {
    const { data, error } = await this.client
      .from("progress_photos")
      .select("id, user_id, storage_path, taken_at, note")
      .eq("user_id", userId)
      .order("taken_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as Omit<ProgressPhotoRow, "created_at">[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      remotePath: row.storage_path,
      takenAt: new Date(row.taken_at),
      note: row.note,
    }));
  }

  async downloadUrl(photoId: string): Promise<string> {
    const { url } = await this.storage<{ url: string }>({
      action: "download",
      photoId,
    });
    return url;
  }

  /**
   * Linha primeiro, arquivo depois: sem a linha, nenhum aparelho tenta
   * restaurar a foto no meio da remoção. Os dois passos são idempotentes,
   * então o retry do tombstone termina o que ficou pela metade.
   */
  async remove(photo: ProgressPhoto): Promise<void> {
    const { error } = await this.client
      .from("progress_photos")
      .delete()
      .eq("id", photo.id)
      .eq("user_id", photo.userId);
    if (error) throw error;

    await this.storage({ action: "delete", photoId: photo.id });
  }
}
