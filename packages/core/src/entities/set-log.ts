import { Load } from "../value-objects/load";

/** Estado de sincronização de um registro criado offline-first. */
export type SyncStatus = "pending" | "synced";

export type SetLogProps = {
  id: string;
  /** Dia da sessão de treino no formato AAAA-MM-DD (fuso do aparelho). */
  sessionDate: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  targetReps: number;
  previousLoad: Load;
  load: Load;
  completedAt: Date;
  syncStatus: SyncStatus;
};

/**
 * Uma série concluída com carga registrada — o registro central do produto.
 * Nasce sempre "pending" (gravado no SQLite local) e vira "synced" quando
 * chega ao Supabase.
 */
export class SetLog {
  private constructor(private readonly props: SetLogProps) {}

  static create(
    props: Omit<SetLogProps, "syncStatus">,
  ): SetLog {
    return new SetLog({ ...props, syncStatus: "pending" });
  }

  /** Reidrata um registro vindo do banco, com o syncStatus persistido. */
  static restore(props: SetLogProps): SetLog {
    return new SetLog(props);
  }

  get id() { return this.props.id; }
  get sessionDate() { return this.props.sessionDate; }
  get exerciseId() { return this.props.exerciseId; }
  get exerciseName() { return this.props.exerciseName; }
  get setNumber() { return this.props.setNumber; }
  get targetReps() { return this.props.targetReps; }
  get previousLoad() { return this.props.previousLoad; }
  get load() { return this.props.load; }
  get completedAt() { return this.props.completedAt; }
  get syncStatus() { return this.props.syncStatus; }

  /** Progressão em relação à sessão anterior (positivo = subiu de carga). */
  get deltaKg(): number {
    return this.props.load.deltaFrom(this.props.previousLoad);
  }

  get isProgress(): boolean {
    return this.deltaKg > 0;
  }

  markSynced(): SetLog {
    return new SetLog({ ...this.props, syncStatus: "synced" });
  }
}
