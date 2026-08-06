import type { SyncStatus } from "./set-log";

export type ProgressPhotoProps = {
  id: string;
  userId: string;
  /** URI do arquivo no dispositivo (sempre presente — é a origem). */
  localUri: string;
  /** Caminho no bucket do Supabase após o upload; null enquanto pendente. */
  remotePath: string | null;
  takenAt: Date;
  note: string | null;
  syncStatus: SyncStatus;
};

/**
 * Foto de progresso corporal. Capturada (câmera ou galeria) e gravada
 * localmente na hora; o upload pro bucket acontece quando houver conexão.
 */
export class ProgressPhoto {
  private constructor(private readonly props: ProgressPhotoProps) {}

  static capture(props: {
    id: string;
    userId: string;
    localUri: string;
    takenAt: Date;
    note?: string;
  }): ProgressPhoto {
    return new ProgressPhoto({
      ...props,
      note: props.note ?? null,
      remotePath: null,
      syncStatus: "pending",
    });
  }

  static restore(props: ProgressPhotoProps): ProgressPhoto {
    return new ProgressPhoto(props);
  }

  get id() { return this.props.id; }
  get userId() { return this.props.userId; }
  get localUri() { return this.props.localUri; }
  get remotePath() { return this.props.remotePath; }
  get takenAt() { return this.props.takenAt; }
  get note() { return this.props.note; }
  get syncStatus() { return this.props.syncStatus; }

  markUploaded(remotePath: string): ProgressPhoto {
    return new ProgressPhoto({
      ...this.props,
      remotePath,
      syncStatus: "synced",
    });
  }
}
