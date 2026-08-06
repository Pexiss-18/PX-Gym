import { SetLog } from "../entities/set-log";
import { Load } from "../value-objects/load";
import type { Clock, IdGenerator, SetLogRepository } from "../ports";

export type RegisterSetInput = {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  targetReps: number;
  loadKg: number;
};

export type RegisterSetOutput = {
  setLog: SetLog;
  /** Progressão vs. última sessão; null quando é a primeira vez no exercício. */
  deltaKg: number | null;
};

/**
 * Registra uma série concluída com carga — grava local (pending) e devolve o
 * delta de progressão pra UI celebrar na hora, sem depender de rede.
 */
export class RegisterSetUseCase {
  constructor(
    private readonly setLogs: SetLogRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: RegisterSetInput): Promise<RegisterSetOutput> {
    const load = Load.fromKg(input.loadKg);
    const previousKg = await this.setLogs.lastLoadKgForExercise(
      input.exerciseId,
    );
    const previousLoad = previousKg === null ? load : Load.fromKg(previousKg);

    const now = this.clock.now();
    const setLog = SetLog.create({
      id: this.ids.next(),
      sessionDate: toIsoDate(now),
      exerciseId: input.exerciseId,
      exerciseName: input.exerciseName,
      setNumber: input.setNumber,
      targetReps: input.targetReps,
      previousLoad,
      load,
      completedAt: now,
    });

    await this.setLogs.save(setLog);

    return {
      setLog,
      deltaKg: previousKg === null ? null : setLog.deltaKg,
    };
  }
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
