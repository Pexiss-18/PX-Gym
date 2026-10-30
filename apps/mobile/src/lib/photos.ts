import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";
import {
  DeleteProgressPhotoUseCase,
  RestoreProgressPhotosUseCase,
  SaveProgressPhotoUseCase,
  SyncPendingPhotosUseCase,
  type DeletePhotoResult,
  type LocalPhotoFiles,
  type PhotoSyncResult,
  type ProgressPhoto,
  type ProgressPhotoCloud,
  type ProgressPhotoUploader,
  type RemoteProgressPhoto,
} from "@px/core";
import { SupabaseProgressPhotoStore } from "@px/db";
import { db } from "@/db";
import { DrizzleProgressPhotoRepository } from "@/db/progress-photo-repository";
import { LocationGatewayExpo } from "@/adapters/gateways/LocationGatewayExpo";
import { supabase } from "./supabase";
import { cryptoIds, netInfoConnectivity, systemClock } from "./system";

/*
 * Composition root das fotos de progresso: arquivo no diretório de documentos
 * do app, registro no SQLite (pending) e upload pro Cloudflare R2 quando há
 * rede.
 * Apagar vira tombstone até a nuvem confirmar; o que está na nuvem e não está
 * no aparelho (reinstalação, celular novo) é baixado de volta.
 */

function photosDir(): Directory {
  const dir = new Directory(Paths.document, "progress-photos");
  if (!dir.exists) dir.create();
  return dir;
}

/**
 * Junta o lado nuvem (@px/db: linha no Postgres + URLs assinadas do R2) com
 * os arquivos do aparelho. Os bytes vão e voltam direto entre o aparelho e
 * o R2. A posição da foto não sobe: fica só no aparelho.
 */
class R2ProgressPhotoCloud implements ProgressPhotoUploader, ProgressPhotoCloud {
  private readonly store = new SupabaseProgressPhotoStore(supabase);

  async upload(photo: ProgressPhoto): Promise<string> {
    const file = new File(photo.localUri);
    const target = await this.store.uploadTarget(photo.id, file.size);
    // Mesmos headers que entraram na assinatura (tipo e tamanho), senão o
    // R2 recusa. Arquivo lido do disco pelo nativo, sem passar pelo JS.
    const res = await file.upload(target.url, {
      httpMethod: "PUT",
      headers: target.headers,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`R2 respondeu ${res.status} ao envio`);
    }
    await this.store.saveRow(photo, target.path);
    return target.path;
  }

  list(userId: string): Promise<RemoteProgressPhoto[]> {
    return this.store.list(userId);
  }

  async download(photo: RemoteProgressPhoto): Promise<string> {
    const url = await this.store.downloadUrl(photo.id);
    // idempotent: um download interrompido antes deixa o arquivo pela metade
    const file = await File.downloadFileAsync(
      url,
      new File(photosDir(), `${photo.id}.jpg`),
      { idempotent: true },
    );
    return file.uri;
  }

  remove(photo: ProgressPhoto): Promise<void> {
    return this.store.remove(photo);
  }
}

const expoPhotoFiles: LocalPhotoFiles = {
  remove(localUri) {
    const file = new File(localUri);
    if (file.exists) file.delete();
  },
};

export const progressPhotoRepository = new DrizzleProgressPhotoRepository(db);

const cloud = new R2ProgressPhotoCloud();

export const saveProgressPhotoUseCase = new SaveProgressPhotoUseCase(
  progressPhotoRepository,
  cloud,
  netInfoConnectivity,
  systemClock,
  cryptoIds,
  new LocationGatewayExpo(),
);

const syncPendingPhotosUseCase = new SyncPendingPhotosUseCase(
  progressPhotoRepository,
  cloud,
  netInfoConnectivity,
  cloud,
);

const restoreProgressPhotosUseCase = new RestoreProgressPhotosUseCase(
  progressPhotoRepository,
  cloud,
  netInfoConnectivity,
);

const deleteProgressPhotoUseCase = new DeleteProgressPhotoUseCase(
  progressPhotoRepository,
  cloud,
  netInfoConnectivity,
  expoPhotoFiles,
);

export type PhotoRoundResult = {
  status: PhotoSyncResult["status"];
  uploaded: number;
  removed: number;
  restored: number;
  failed: number;
};

let inFlight: Promise<PhotoRoundResult | null> | null = null;

/**
 * Uma rodada completa: remoções pendentes, envios pendentes e, por último,
 * o que falta baixar da nuvem. Não propaga falha (mesmo contrato do sync de
 * séries); null = a rodada nem terminou (erro inesperado, ex.: SQLite ou a
 * listagem remota). Chamadas simultâneas (sync automático + botão) dividem a
 * mesma rodada, senão a restauração baixaria a mesma foto duas vezes.
 */
export function trySyncPhotos(userId: string): Promise<PhotoRoundResult | null> {
  inFlight ??= (async () => {
    try {
      const sync = await syncPendingPhotosUseCase.execute();
      const restore = await restoreProgressPhotosUseCase.execute(userId);
      return {
        ...sync,
        failed: sync.failed + restore.failed,
        restored: restore.restored,
      };
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function deleteProgressPhoto(id: string): Promise<DeletePhotoResult> {
  return deleteProgressPhotoUseCase.execute(id);
}

/**
 * Move a captura do cache da câmera pro diretório permanente do app.
 * O cache pode ser limpo pelo sistema; o documento não.
 */
export function persistCapture(cacheUri: string): string {
  const dest = new File(photosDir(), `${Crypto.randomUUID()}.jpg`);
  new File(cacheUri).move(dest);
  return dest.uri;
}
