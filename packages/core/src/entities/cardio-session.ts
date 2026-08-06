import type { SyncStatus } from "./set-log";
import {
  Distance,
  Duration,
  GeoPoint,
  avgPaceMinPerKm,
} from "../value-objects/geo";

export type CardioSessionProps = {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date;
  path: GeoPoint[];
  syncStatus: SyncStatus;
};

/** Sessão de cardio ao ar livre (corrida) com rota rastreada por GPS. */
export class CardioSession {
  private constructor(private readonly props: CardioSessionProps) {}

  static finish(props: Omit<CardioSessionProps, "syncStatus">): CardioSession {
    return new CardioSession({ ...props, syncStatus: "pending" });
  }

  static restore(props: CardioSessionProps): CardioSession {
    return new CardioSession(props);
  }

  get id() { return this.props.id; }
  get userId() { return this.props.userId; }
  get startedAt() { return this.props.startedAt; }
  get endedAt() { return this.props.endedAt; }
  get path() { return this.props.path; }
  get syncStatus() { return this.props.syncStatus; }

  get distance(): Distance {
    return Distance.alongPath(this.props.path);
  }

  get duration(): Duration {
    return Duration.between(this.props.startedAt, this.props.endedAt);
  }

  get paceMinPerKm(): number | null {
    return avgPaceMinPerKm(this.distance, this.duration);
  }

  markSynced(): CardioSession {
    return new CardioSession({ ...this.props, syncStatus: "synced" });
  }
}
