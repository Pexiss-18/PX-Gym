import { ProgressPhoto } from "../entities/progress-photo";
import type {
  Clock,
  ConnectivityStatus,
  IdGenerator,
  ProgressPhotoRepository,
  ProgressPhotoUploader,
} from "../ports";

export type SaveProgressPhotoInput = {
  userId: string;
  localUri: string;
  note?: string;
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
  ) {}

  async execute(input: SaveProgressPhotoInput): Promise<ProgressPhoto> {
    let photo = ProgressPhoto.capture({
      id: this.ids.next(),
      userId: input.userId,
      localUri: input.localUri,
      takenAt: this.clock.now(),
      note: input.note,
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
  | { status: "offline"; uploaded: 0; failed: 0 }
  /** failed > 0: essas fotos continuam pending pra próxima rodada. */
  | { status: "done"; uploaded: number; failed: number };

/** Reenvia fotos pendentes quando a conexão volta. */
export class SyncPendingPhotosUseCase {
  constructor(
    private readonly photos: ProgressPhotoRepository,
    private readonly uploader: ProgressPhotoUploader,
    private readonly connectivity: ConnectivityStatus,
  ) {}

  async execute(): Promise<PhotoSyncResult> {
    if (!(await this.connectivity.isOnline())) {
      return { status: "offline", uploaded: 0, failed: 0 };
    }

    const pending = await this.photos.pendingUpload();
    let uploaded = 0;
    for (const photo of pending) {
      try {
        const remotePath = await this.uploader.upload(photo);
        await this.photos.markUploaded(photo.id, remotePath);
        uploaded++;
      } catch {
        // tenta as demais; esta fica pra próxima rodada
      }
    }
    return { status: "done", uploaded, failed: pending.length - uploaded };
  }
}
