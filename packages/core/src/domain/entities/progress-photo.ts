import type { SyncStatus } from "./set-log";

/**
 * Onde a foto foi tirada. Fica só no aparelho: não sobe pra nuvem junto com
 * a imagem, pra não expor onde a pessoa mora ou treina.
 */
export type PhotoLocation = { latitude: number; longitude: number };

export type ProgressPhotoProps = {
  id: string;
  userId: string;
  /** URI do arquivo no dispositivo (sempre presente — é a origem). */
  localUri: string;
  /** Chave no Cloudflare R2 após o upload; null enquanto pendente. */
  remotePath: string | null;
  takenAt: Date;
  note: string | null;
  /** null quando não houve permissão ou sinal de GPS. */
  location: PhotoLocation | null;
  /**
   * "deleted" é um tombstone: a pessoa apagou a foto, o arquivo local já
   * foi embora, mas a cópia da nuvem ainda precisa ser removida.
   */
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
    location?: PhotoLocation | null;
  }): ProgressPhoto {
    return new ProgressPhoto({
      ...props,
      note: props.note ?? null,
      location: props.location ?? null,
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
  get location() { return this.props.location; }
  get syncStatus() { return this.props.syncStatus; }

  markUploaded(remotePath: string): ProgressPhoto {
    return new ProgressPhoto({
      ...this.props,
      remotePath,
      syncStatus: "synced",
    });
  }

  markDeleted(): ProgressPhoto {
    return new ProgressPhoto({ ...this.props, syncStatus: "deleted" });
  }
}
