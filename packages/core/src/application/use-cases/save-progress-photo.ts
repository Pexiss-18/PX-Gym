import {
  ProgressPhoto,
  type PhotoLocation,
} from "../../domain/entities/progress-photo";
import type {
  Clock,
  ConnectivityStatus,
  IdGenerator,
  LocalPhotoFiles,
  LocationGateway,
  ProgressPhotoCloud,
  ProgressPhotoRepository,
  ProgressPhotoUploader,
} from "../../domain/contracts";
import { CloudStorageFullError, type CloudFullScope } from "../../domain/errors";

export type SaveProgressPhotoInput = {
  userId: string;
  localUri: string;
  note?: string;
  /**
   * true quando o salvamento nasce de um gesto do usuário (o disparo da
   * câmera): aí, e só aí, o diálogo de permissão de localização pode abrir.
   */
  askLocation?: boolean;
};

/**
 * Salva a foto de progresso localmente na hora e tenta o upload em seguida
 * se houver rede. Falha de upload não é erro do caso de uso: a foto fica
 * pending e o SyncPendingPhotosUseCase resolve depois.
 */
export class SaveProgressPhotoUseCase {
  constructor(
    private readonly photos: ProgressPhotoRepository,
    private readonly uploader: ProgressPhotoUploader,
    private readonly connectivity: ConnectivityStatus,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    /** Opcional: sem GPS, a foto é salva sem posição. */
    private readonly location?: LocationGateway,
  ) {}

  /**
   * Posição de onde a foto foi tirada, ou null. Nunca lança: a foto é o que
   * importa, a posição é um extra — falta de permissão ou de sinal não pode
   * impedir o salvamento.
   */
  private async whereTaken(ask: boolean): Promise<PhotoLocation | null> {
    if (!this.location) return null;
    try {
      let permission = await this.location.permission();
      if (permission !== "granted" && ask && permission !== "blocked") {
        permission = await this.location.requestPermission();
      }
      if (permission !== "granted") return null;
      const { latitude, longitude } = await this.location.currentPosition();
      return { latitude, longitude };
    } catch {
      return null;
    }
  }

  async execute(input: SaveProgressPhotoInput): Promise<ProgressPhoto> {
    let photo = ProgressPhoto.capture({
      id: this.ids.next(),
      userId: input.userId,
      localUri: input.localUri,
      takenAt: this.clock.now(),
      note: input.note,
      location: await this.whereTaken(input.askLocation ?? false),
    });

    await this.photos.save(photo);

    if (await this.connectivity.isOnline()) {
      try {
        const remotePath = await this.uploader.upload(photo);
        await this.photos.markUploaded(photo.id, remotePath);
        photo = photo.markUploaded(remotePath);
      } catch {
        // continua pending; sync posterior cuida disso
      }
    }

    return photo;
  }
}

export type PhotoSyncResult =
  | { status: "offline"; uploaded: 0; removed: 0; failed: 0; cloudFull: null }
  | {
      status: "done";
      uploaded: number;
      removed: number;
      /** failed > 0: essas fotos (envio ou remoção) ficam pra próxima rodada. */
      failed: number;
      /** A nuvem recusou por falta de espaço: os envios pararam ali. */
      cloudFull: CloudFullScope | null;
    };

/**
 * Quando a conexão volta: resolve os tombstones (apaga na nuvem e só então
 * a linha local) e reenvia as fotos pendentes.
 */
export class SyncPendingPhotosUseCase {
  constructor(
    private readonly photos: ProgressPhotoRepository,
    private readonly uploader: ProgressPhotoUploader,
    private readonly connectivity: ConnectivityStatus,
    private readonly cloud: ProgressPhotoCloud,
  ) {}

  async execute(): Promise<PhotoSyncResult> {
    if (!(await this.connectivity.isOnline())) {
      return { status: "offline", uploaded: 0, removed: 0, failed: 0, cloudFull: null };
    }

    let failed = 0;
    let cloudFull: CloudFullScope | null = null;

    const deleted = await this.photos.pendingDeletion();
    let removed = 0;
    for (const photo of deleted) {
      try {
        await this.cloud.remove(photo);
        await this.photos.remove(photo.id);
        removed++;
      } catch {
        failed++;
      }
    }

    // Remoções vêm antes dos envios: liberam espaço na nuvem.
    const pending = await this.photos.pendingUpload();
    let uploaded = 0;
    for (const [i, photo] of pending.entries()) {
      try {
        const remotePath = await this.uploader.upload(photo);
        await this.photos.markUploaded(photo.id, remotePath);
        uploaded++;
      } catch (error) {
        if (error instanceof CloudStorageFullError) {
          // sem espaço, as próximas também seriam recusadas
          cloudFull = error.scope;
          failed += pending.length - i;
          break;
        }
        // tenta as demais; esta fica pra próxima rodada
        failed++;
      }
    }
    return { status: "done", uploaded, removed, failed, cloudFull };
  }
}

export type DeletePhotoResult =
  | { status: "not-found" }
  /** Sumiu do aparelho e da nuvem. */
  | { status: "removed" }
  /** Sumiu do aparelho; a cópia da nuvem sai no próximo sync. */
  | { status: "pending-removal" };

/**
 * Apaga a foto. Do ponto de vista da pessoa é na hora: o arquivo local sai
 * e a linha vira tombstone (some da galeria). A nuvem é tentada em seguida
 * se houver rede; sem rede, o SyncPendingPhotosUseCase termina o serviço.
 *
 * Até foto "pending" vira tombstone: o upload pode ter chegado ao servidor
 * sem a confirmação voltar, e aí a restauração a traria de volta.
 */
export class DeleteProgressPhotoUseCase {
  constructor(
    private readonly photos: ProgressPhotoRepository,
    private readonly cloud: ProgressPhotoCloud,
    private readonly connectivity: ConnectivityStatus,
    private readonly files: LocalPhotoFiles,
  ) {}

  async execute(id: string): Promise<DeletePhotoResult> {
    const photo = await this.photos.byId(id);
    if (!photo || photo.syncStatus === "deleted") return { status: "not-found" };

    await this.photos.markDeleted(id);
    try {
      this.files.remove(photo.localUri);
    } catch {
      // arquivo órfão no aparelho não pode travar a exclusão
    }

    if (await this.connectivity.isOnline()) {
      try {
        await this.cloud.remove(photo);
        await this.photos.remove(id);
        return { status: "removed" };
      } catch {
        // continua tombstone; sync posterior cuida disso
      }
    }
    return { status: "pending-removal" };
  }
}

export type PhotoRestoreResult =
  | { status: "offline"; restored: 0; failed: 0 }
  | { status: "done"; restored: number; failed: number };

/**
 * Traz pro aparelho as fotos que estão na nuvem e não estão aqui —
 * reinstalação ou celular novo. A posição de onde foram tiradas não volta:
 * ela nunca saiu do aparelho original.
 */
export class RestoreProgressPhotosUseCase {
  constructor(
    private readonly photos: ProgressPhotoRepository,
    private readonly cloud: ProgressPhotoCloud,
    private readonly connectivity: ConnectivityStatus,
  ) {}

  async execute(userId: string): Promise<PhotoRestoreResult> {
    if (!(await this.connectivity.isOnline())) {
      return { status: "offline", restored: 0, failed: 0 };
    }

    const known = new Set(await this.photos.knownIds(userId));
    const missing = (await this.cloud.list(userId)).filter(
      (remote) => !known.has(remote.id),
    );

    let restored = 0;
    for (const remote of missing) {
      try {
        const localUri = await this.cloud.download(remote);
        await this.photos.save(
          ProgressPhoto.restore({
            ...remote,
            localUri,
            location: null,
            syncStatus: "synced",
          }),
        );
        restored++;
      } catch {
        // tenta as demais; esta volta na próxima rodada
      }
    }
    return { status: "done", restored, failed: missing.length - restored };
  }
}
