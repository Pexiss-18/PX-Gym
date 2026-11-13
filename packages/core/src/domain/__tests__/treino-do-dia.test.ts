import { SetLog } from "../entities/set-log";
import type { WorkoutPlan } from "../entities/workout-plan";
import { Load } from "../value-objects/load";
import { indiceDoTreinoDeHoje, montarTreinoDoDia } from "../services/treino-do-dia";

function exercicio(exerciseId: string, sets = 3) {
  return {
    exerciseId,
    name: exerciseId,
    muscleGroup: "Grupo",
    sets,
    reps: 10,
    restSeconds: 90,
    notes: "",
  };
}

const PLANO: WorkoutPlan = {
  id: "plano-1",
  userId: "user-1",
  name: "ABC — Hipertrofia",
  rationale: "Três dias.",
  sources: ["schoenfeld-2017-volume"],
  createdAt: new Date("2026-11-01T10:00:00Z"),
  days: [
    { label: "A", name: "Peito e Tríceps", focus: "Hipertrofia", estimatedMinutes: 55, exercises: [exercicio("supino-reto", 4), exercicio("crucifixo-cabo"), exercicio("triceps-corda")] },
    { label: "B", name: "Costas e Bíceps", focus: "Hipertrofia", estimatedMinutes: 50, exercises: [exercicio("puxada-frontal"), exercicio("remada-baixa"), exercicio("rosca-direta")] },
    { label: "C", name: "Pernas", focus: "Força", estimatedMinutes: 60, exercises: [exercicio("agachamento-livre"), exercicio("leg-press"), exercicio("mesa-flexora")] },
  ],
};

function log(sessionDate: string, exerciseId: string, loadKg: number, setNumber = 1): SetLog {
  return SetLog.create({
    id: `${sessionDate}-${exerciseId}-${setNumber}`,
    sessionDate,
    exerciseId,
    exerciseName: exerciseId,
    setNumber,
    targetReps: 10,
    previousLoad: Load.fromKg(loadKg),
    load: Load.fromKg(loadKg),
    completedAt: new Date(`${sessionDate}T10:00:00`),
  });
}

const HOJE = "2026-11-13";

describe("indiceDoTreinoDeHoje", () => {
  it("sem histórico, começa pelo treino A", () => {
    expect(indiceDoTreinoDeHoje(PLANO, [], HOJE)).toBe(0);
  });

  it("depois do treino B, hoje é o C", () => {
    const historico = [log("2026-11-10", "supino-reto", 60), log("2026-11-12", "puxada-frontal", 50), log("2026-11-12", "rosca-direta", 14)];
    expect(indiceDoTreinoDeHoje(PLANO, historico, HOJE)).toBe(2);
  });

  it("depois do último dia, volta para o A", () => {
    const historico = [log("2026-11-12", "leg-press", 120), log("2026-11-12", "mesa-flexora", 40)];
    expect(indiceDoTreinoDeHoje(PLANO, historico, HOJE)).toBe(0);
  });

  it("se já treinou hoje, continua no treino de hoje", () => {
    const historico = [log("2026-11-12", "supino-reto", 60), log(HOJE, "puxada-frontal", 50)];
    expect(indiceDoTreinoDeHoje(PLANO, historico, HOJE)).toBe(1);
  });

  it("histórico de exercícios que não estão no plano não conta", () => {
    expect(indiceDoTreinoDeHoje(PLANO, [log("2026-11-12", "peck-deck", 40)], HOJE)).toBe(0);
  });

  it("a sessão mais recente que bate com o plano decide", () => {
    const historico = [log("2026-11-11", "supino-reto", 60), log("2026-11-12", "peck-deck", 40)];
    expect(indiceDoTreinoDeHoje(PLANO, historico, HOJE)).toBe(1);
  });
});

describe("montarTreinoDoDia", () => {
  it("vira um Workout com as séries do plano e a carga da última sessão", () => {
    const historico = [
      log("2026-11-03", "supino-reto", 55),
      log("2026-11-10", "supino-reto", 60, 1),
      log("2026-11-10", "supino-reto", 62.5, 2),
      log(HOJE, "supino-reto", 65),
    ];

    const treino = montarTreinoDoDia(PLANO, 0, historico, HOJE);

    expect(treino.id).toBe("plano-1:A");
    expect(treino.label).toBe("Treino A");
    expect(treino.name).toBe("Peito e Tríceps");
    expect(treino.focus).toBe("Hipertrofia");
    expect(treino.estimatedMinutes).toBe(55);
    const supino = treino.exercises[0]!;
    expect(supino).toMatchObject({ id: "supino-reto", restSeconds: 90 });
    expect(supino.sets).toHaveLength(4);
    expect(supino.sets[0]).toEqual({
      setNumber: 1,
      targetReps: 10,
      targetLoadKg: 62.5,
      previousLoadKg: 62.5,
      completed: false,
    });
  });

  it("exercício nunca feito começa com carga zero", () => {
    const treino = montarTreinoDoDia(PLANO, 1, [], HOJE);
    expect(treino.exercises.map((e) => e.sets[0]!.previousLoadKg)).toEqual([0, 0, 0]);
    expect(treino.progress()).toEqual({ completedSets: 0, totalSets: 9, fraction: 0 });
  });

  it("índice fora do plano é recusado", () => {
    expect(() => montarTreinoDoDia(PLANO, 3, [], HOJE)).toThrow();
  });
});
