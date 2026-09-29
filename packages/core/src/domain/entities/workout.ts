/** Série planejada de um exercício (o alvo, não o realizado — ver SetLog). */
export type PlannedSet = {
  setNumber: number;
  targetReps: number;
  targetLoadKg: number;
  previousLoadKg: number;
  completed: boolean;
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  restSeconds: number;
  sets: PlannedSet[];
};

export type WorkoutProgress = {
  completedSets: number;
  totalSets: number;
  /** 0..1 */
  fraction: number;
};

/** Um dia de treino (ex.: "Treino A — Peito e tríceps") com seus exercícios. */
export class Workout {
  constructor(
    readonly id: string,
    readonly label: string,
    readonly name: string,
    readonly focus: string,
    readonly estimatedMinutes: number,
    readonly exercises: Exercise[],
  ) {}

  progress(): WorkoutProgress {
    const all = this.exercises.flatMap((e) => e.sets);
    const completed = all.filter((s) => s.completed).length;
    return {
      completedSets: completed,
      totalSets: all.length,
      fraction: all.length === 0 ? 0 : completed / all.length,
    };
  }

  get isComplete(): boolean {
    const { completedSets, totalSets } = this.progress();
    return totalSets > 0 && completedSets === totalSets;
  }
}
