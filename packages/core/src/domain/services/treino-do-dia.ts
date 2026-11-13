import type { SetLog } from "../entities/set-log";
import type { WorkoutPlan } from "../entities/workout-plan";
import { Workout } from "../entities/workout";
import { InvalidValueError } from "../errors";

/** Dia do plano que mais tem exercícios em comum com uma sessão; -1 se nenhum. */
function diaDaSessao(plano: WorkoutPlan, exercicios: Set<string>): number {
  let melhor = -1;
  let maior = 0;
  plano.days.forEach((dia, i) => {
    const comuns = dia.exercises.filter((e) => exercicios.has(e.exerciseId)).length;
    if (comuns > maior) {
      maior = comuns;
      melhor = i;
    }
  });
  return melhor;
}

/**
 * Qual dia do plano é o de hoje. Se a pessoa já treinou hoje, continua no
 * mesmo dia; senão, é o dia seguinte ao da última sessão que bate com o
 * plano (depois do último, volta ao primeiro). Sem histórico, o primeiro.
 */
export function indiceDoTreinoDeHoje(plano: WorkoutPlan, historico: SetLog[], hoje: string): number {
  if (plano.days.length === 0) return 0;

  const porDia = new Map<string, Set<string>>();
  for (const log of historico) {
    const exercicios = porDia.get(log.sessionDate) ?? new Set<string>();
    exercicios.add(log.exerciseId);
    porDia.set(log.sessionDate, exercicios);
  }

  const hojeNoPlano = porDia.has(hoje) ? diaDaSessao(plano, porDia.get(hoje)!) : -1;
  if (hojeNoPlano >= 0) return hojeNoPlano;

  const anteriores = [...porDia.keys()].filter((data) => data < hoje).sort().reverse();
  for (const data of anteriores) {
    const dia = diaDaSessao(plano, porDia.get(data)!);
    if (dia >= 0) return (dia + 1) % plano.days.length;
  }
  return 0;
}

/** Maior carga da sessão mais recente antes de hoje, por exercício. */
function cargasAnteriores(historico: SetLog[], hoje: string): Map<string, number> {
  const ultima = new Map<string, { data: string; kg: number }>();
  for (const log of historico) {
    if (log.sessionDate >= hoje) continue;
    const atual = ultima.get(log.exerciseId);
    if (!atual || log.sessionDate > atual.data) {
      ultima.set(log.exerciseId, { data: log.sessionDate, kg: log.load.kg });
    } else if (log.sessionDate === atual.data && log.load.kg > atual.kg) {
      atual.kg = log.load.kg;
    }
  }
  return new Map([...ultima].map(([id, { kg }]) => [id, kg]));
}

/**
 * Transforma um dia do plano no Workout que as telas desenham. A meta de
 * carga de cada série é a maior carga da última sessão do exercício: a
 * pessoa sobe no stepper quando der conta. Exercício novo começa em zero.
 */
export function montarTreinoDoDia(
  plano: WorkoutPlan,
  indice: number,
  historico: SetLog[],
  hoje: string,
): Workout {
  const dia = plano.days[indice];
  if (!dia) throw new InvalidValueError(`O plano não tem o dia ${indice + 1}.`);

  const anteriores = cargasAnteriores(historico, hoje);
  return new Workout(
    `${plano.id}:${dia.label}`,
    `Treino ${dia.label}`,
    dia.name,
    dia.focus,
    dia.estimatedMinutes,
    dia.exercises.map((exercicio) => {
      const kg = anteriores.get(exercicio.exerciseId) ?? 0;
      return {
        id: exercicio.exerciseId,
        name: exercicio.name,
        muscleGroup: exercicio.muscleGroup,
        restSeconds: exercicio.restSeconds,
        sets: Array.from({ length: exercicio.sets }, (_, i) => ({
          setNumber: i + 1,
          targetReps: exercicio.reps,
          targetLoadKg: kg,
          previousLoadKg: kg,
          completed: false,
        })),
      };
    }),
  );
}
