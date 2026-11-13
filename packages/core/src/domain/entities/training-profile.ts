/**
 * Perfil de treino (tabela user_profiles): o que a IA precisa saber da pessoa
 * para montar o treino e a dieta. Os valores espelham os checks do banco
 * (migration 0004) e o perfilSchema da Edge Function generate-plan.
 */
export const OBJETIVOS = ["hipertrofia", "emagrecimento", "forca", "condicionamento", "saude"] as const;
export const NIVEIS = ["iniciante", "intermediario", "avancado"] as const;
export const SEXOS = ["masculino", "feminino"] as const;
/** Regiões com dor ou lesão: os exercícios que as sobrecarregam ficam de fora. */
export const REGIOES_SENSIVEIS = ["ombro", "lombar", "joelho", "cotovelo", "punho"] as const;

export type Objetivo = (typeof OBJETIVOS)[number];
export type Nivel = (typeof NIVEIS)[number];
export type Sexo = (typeof SEXOS)[number];
export type RegiaoSensivel = (typeof REGIOES_SENSIVEIS)[number];

export type TrainingProfile = {
  userId: string;
  sex: Sexo;
  /** AAAA-MM-DD. */
  birthDate: string;
  heightCm: number;
  goal: Objetivo;
  level: Nivel;
  daysPerWeek: number;
  minutesPerSession: number;
  /** Lesões e limitações, em texto livre. */
  restrictions: string;
  sensitiveRegions: RegiaoSensivel[];
  /** Aprendidos pela IA nos pedidos de mudança; a tela não edita. */
  unavailableExercises: string[];
  dislikedFoods: string[];
};
