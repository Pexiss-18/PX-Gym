/**
 * Único mock restante: o plano de treino do dia. Não existe tabela de
 * treinos ainda — o plano vira dado real quando houver montagem de treino.
 * O que foi FEITO (séries, cargas, progresso) já é 100% real via SQLite;
 * os flags `completed` daqui são ignorados pelas telas.
 */
import { Workout } from "@px/core";

export const todayWorkout = new Workout(
  "treino-a",
  "Treino A",
  "Peito e Tríceps",
  "Força e hipertrofia",
  55,
  [
    {
      id: "supino-reto",
      name: "Supino reto com barra",
      muscleGroup: "Peito",
      restSeconds: 90,
      sets: [
        { setNumber: 1, targetReps: 10, targetLoadKg: 60, previousLoadKg: 57.5, completed: false },
        { setNumber: 2, targetReps: 10, targetLoadKg: 60, previousLoadKg: 60, completed: false },
        { setNumber: 3, targetReps: 8, targetLoadKg: 65, previousLoadKg: 60, completed: false },
        { setNumber: 4, targetReps: 8, targetLoadKg: 65, previousLoadKg: 60, completed: false },
      ],
    },
    {
      id: "supino-inclinado-halteres",
      name: "Supino inclinado com halteres",
      muscleGroup: "Peito",
      restSeconds: 75,
      sets: [
        { setNumber: 1, targetReps: 12, targetLoadKg: 24, previousLoadKg: 22, completed: false },
        { setNumber: 2, targetReps: 12, targetLoadKg: 24, previousLoadKg: 24, completed: false },
        { setNumber: 3, targetReps: 10, targetLoadKg: 26, previousLoadKg: 24, completed: false },
      ],
    },
    {
      id: "crucifixo-cabo",
      name: "Crucifixo no cabo",
      muscleGroup: "Peito",
      restSeconds: 60,
      sets: [
        { setNumber: 1, targetReps: 15, targetLoadKg: 14, previousLoadKg: 12, completed: false },
        { setNumber: 2, targetReps: 15, targetLoadKg: 14, previousLoadKg: 14, completed: false },
        { setNumber: 3, targetReps: 12, targetLoadKg: 16, previousLoadKg: 14, completed: false },
      ],
    },
    {
      id: "triceps-corda",
      name: "Tríceps corda",
      muscleGroup: "Tríceps",
      restSeconds: 60,
      sets: [
        { setNumber: 1, targetReps: 12, targetLoadKg: 25, previousLoadKg: 22.5, completed: false },
        { setNumber: 2, targetReps: 12, targetLoadKg: 25, previousLoadKg: 25, completed: false },
        { setNumber: 3, targetReps: 10, targetLoadKg: 27.5, previousLoadKg: 25, completed: false },
      ],
    },
    {
      id: "triceps-frances",
      name: "Tríceps francês",
      muscleGroup: "Tríceps",
      restSeconds: 60,
      sets: [
        { setNumber: 1, targetReps: 12, targetLoadKg: 18, previousLoadKg: 16, completed: false },
        { setNumber: 2, targetReps: 12, targetLoadKg: 18, previousLoadKg: 18, completed: false },
      ],
    },
  ],
);
