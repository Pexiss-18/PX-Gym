import type {
  BodyMetrics,
  Exercise,
  Meal,
  NutritionDay,
  WorkoutDay,
} from "@/lib/types";

export const user = {
  name: "Paulo",
  goal: "Hipertrofia",
  streakDays: 12,
  avatarInitials: "PR",
};

export const bodyMetrics: BodyMetrics = {
  weightKg: 78.4,
  weightDeltaKg: -0.6,
  bodyFatPct: 15.2,
  bodyFatDeltaPct: -0.8,
  muscleMassKg: 34.7,
  muscleMassDeltaKg: 0.4,
  lastAssessment: "22 jul",
  nextAssessment: "19 ago",
  measurements: [
    { label: "Peito", valueCm: 102.5, deltaCm: 0.5 },
    { label: "Cintura", valueCm: 81.2, deltaCm: -1.1 },
    { label: "Quadril", valueCm: 98.3, deltaCm: -0.3 },
    { label: "Braço", valueCm: 37.8, deltaCm: 0.4 },
    { label: "Coxa", valueCm: 58.6, deltaCm: 0.6 },
  ],
  history: [
    { date: "Mar", weightKg: 82.1, bodyFatPct: 18.9 },
    { date: "Abr", weightKg: 81.0, bodyFatPct: 18.1 },
    { date: "Mai", weightKg: 80.2, bodyFatPct: 17.2 },
    { date: "Jun", weightKg: 79.5, bodyFatPct: 16.4 },
    { date: "Jul", weightKg: 79.0, bodyFatPct: 16.0 },
    { date: "Ago", weightKg: 78.4, bodyFatPct: 15.2 },
  ],
};

const benchPress: Exercise = {
  id: "supino-reto",
  name: "Supino reto com barra",
  muscleGroup: "Peito",
  restSeconds: 90,
  sets: [
    { setNumber: 1, targetReps: 10, targetLoadKg: 60, previousLoadKg: 57.5, completed: true },
    { setNumber: 2, targetReps: 10, targetLoadKg: 60, previousLoadKg: 60, completed: true },
    { setNumber: 3, targetReps: 8, targetLoadKg: 65, previousLoadKg: 60, completed: false },
    { setNumber: 4, targetReps: 8, targetLoadKg: 65, previousLoadKg: 60, completed: false },
  ],
};

const inclineDumbbell: Exercise = {
  id: "supino-inclinado-halteres",
  name: "Supino inclinado com halteres",
  muscleGroup: "Peito",
  restSeconds: 75,
  sets: [
    { setNumber: 1, targetReps: 12, targetLoadKg: 24, previousLoadKg: 22, completed: true },
    { setNumber: 2, targetReps: 12, targetLoadKg: 24, previousLoadKg: 24, completed: false },
    { setNumber: 3, targetReps: 10, targetLoadKg: 26, previousLoadKg: 24, completed: false },
  ],
};

const cableFly: Exercise = {
  id: "crucifixo-cabo",
  name: "Crucifixo no cabo",
  muscleGroup: "Peito",
  restSeconds: 60,
  sets: [
    { setNumber: 1, targetReps: 15, targetLoadKg: 14, previousLoadKg: 12, completed: false },
    { setNumber: 2, targetReps: 15, targetLoadKg: 14, previousLoadKg: 14, completed: false },
    { setNumber: 3, targetReps: 12, targetLoadKg: 16, previousLoadKg: 14, completed: false },
  ],
};

const tricepsPushdown: Exercise = {
  id: "triceps-corda",
  name: "Tríceps corda",
  muscleGroup: "Tríceps",
  restSeconds: 60,
  sets: [
    { setNumber: 1, targetReps: 12, targetLoadKg: 25, previousLoadKg: 22.5, completed: false },
    { setNumber: 2, targetReps: 12, targetLoadKg: 25, previousLoadKg: 25, completed: false },
    { setNumber: 3, targetReps: 10, targetLoadKg: 27.5, previousLoadKg: 25, completed: false },
  ],
};

const overheadExtension: Exercise = {
  id: "triceps-frances",
  name: "Tríceps francês",
  muscleGroup: "Tríceps",
  restSeconds: 60,
  sets: [
    { setNumber: 1, targetReps: 12, targetLoadKg: 18, previousLoadKg: 16, completed: false },
    { setNumber: 2, targetReps: 12, targetLoadKg: 18, previousLoadKg: 18, completed: false },
  ],
};

export const todayWorkout: WorkoutDay = {
  id: "treino-a",
  label: "Treino A",
  name: "Peito e Tríceps",
  focus: "Força e hipertrofia",
  estimatedMinutes: 55,
  exercises: [benchPress, inclineDumbbell, cableFly, tricepsPushdown, overheadExtension],
};

export const weekSchedule = [
  { day: "Seg", label: "Treino A", muscle: "Peito e Tríceps", active: true, done: true },
  { day: "Ter", label: "Treino B", muscle: "Costas e Bíceps", active: false, done: true },
  { day: "Qua", label: "Descanso", muscle: "Recuperação", active: false, done: true },
  { day: "Qui", label: "Treino C", muscle: "Pernas", active: true, done: false },
  { day: "Sex", label: "Treino D", muscle: "Ombro e Core", active: false, done: false },
  { day: "Sáb", label: "Treino A", muscle: "Peito e Tríceps", active: false, done: false },
  { day: "Dom", label: "Descanso", muscle: "Recuperação", active: false, done: false },
];

const meals: Meal[] = [
  {
    id: "cafe-da-manha",
    name: "Café da manhã",
    time: "07:30",
    logged: true,
    calories: 480,
    items: [
      { name: "Ovos mexidos", qty: "3 un" },
      { name: "Pão integral", qty: "2 fatias" },
      { name: "Pasta de amendoim", qty: "1 colher" },
    ],
    macros: { protein: 32, carbs: 45, fat: 16 },
  },
  {
    id: "almoco",
    name: "Almoço",
    time: "12:30",
    logged: true,
    calories: 720,
    items: [
      { name: "Peito de frango grelhado", qty: "200g" },
      { name: "Arroz integral", qty: "150g" },
      { name: "Feijão", qty: "100g" },
      { name: "Salada verde", qty: "à vontade" },
    ],
    macros: { protein: 52, carbs: 68, fat: 14 },
  },
  {
    id: "lanche",
    name: "Lanche da tarde",
    time: "16:00",
    logged: false,
    calories: 260,
    items: [
      { name: "Whey protein", qty: "1 scoop" },
      { name: "Banana", qty: "1 un" },
      { name: "Aveia", qty: "30g" },
    ],
    macros: { protein: 28, carbs: 32, fat: 4 },
  },
  {
    id: "jantar",
    name: "Jantar",
    time: "20:00",
    logged: false,
    calories: 560,
    items: [
      { name: "Tilápia assada", qty: "180g" },
      { name: "Batata doce", qty: "150g" },
      { name: "Brócolis", qty: "100g" },
    ],
    macros: { protein: 38, carbs: 40, fat: 12 },
  },
];

export const nutritionDay: NutritionDay = {
  caloriesTarget: 2600,
  caloriesConsumed: meals
    .filter((m) => m.logged)
    .reduce((sum, m) => sum + m.calories, 0),
  waterMl: { current: 1800, target: 3000 },
  macros: [
    { key: "protein", label: "Proteína", currentG: 112, targetG: 190, caloriesPerG: 4 },
    { key: "carbs", label: "Carboidrato", currentG: 145, targetG: 280, caloriesPerG: 4 },
    { key: "fat", label: "Gordura", currentG: 34, targetG: 75, caloriesPerG: 9 },
  ],
  meals,
};
