import type { PxSupabaseClient } from "./client";
import { BUCKETS } from "./types";

/** Caminho padronizado: {userId}/... — as políticas RLS do storage dependem disso. */

export function assessmentPdfPath(userId: string, assessmentId: string) {
  return `${userId}/${assessmentId}.pdf`;
}

export function progressPhotoPath(userId: string, photoId: string) {
  return `${userId}/${photoId}.jpg`;
}

export async function uploadProgressPhoto(
  client: PxSupabaseClient,
  path: string,
  file: ArrayBuffer | Blob,
): Promise<string> {
  const { error } = await client.storage
    .from(BUCKETS.progressPhotos)
    .upload(path, file, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}

export async function signedPhotoUrl(
  client: PxSupabaseClient,
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await client.storage
    .from(BUCKETS.progressPhotos)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
