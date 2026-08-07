import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check, Minus, Plus, Timer } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Load } from "@px/core";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { todayWorkout } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import {
  registerSetUseCase,
  setLogRepository,
  todayIsoDate,
  trySyncSetLogs,
} from "@/lib/workout";

type SetState = {
  setNumber: number;
  targetReps: number;
  previousLoadKg: number;
  loadKg: number;
  completed: boolean;
  /** id do SetLog no SQLite quando a série está registrada. */
  logId: string | null;
};

/**
 * Detalhe do exercício com o Set Row do DESIGN.md: check circular que enche
 * de volt, meta de reps + carga anterior como meta muted, stepper −/valor/+
 * em passos de 2.5kg (sem teclado durante o treino) e delta em volt quando
 * a carga de hoje supera a anterior.
 *
 * Offline-first: o check grava via RegisterSetUseCase no SQLite (pending) e
 * tenta um sync oportunista; desmarcar remove o registro local. O estado do
 * dia é hidratado do banco, então fechar e reabrir a tela não perde nada.
 */
export default function ExercicioScreen() {
  const { exercicioId } = useLocalSearchParams<{ exercicioId: string }>();
  const { session } = useAuth();
  const exercise = todayWorkout.exercises.find((e) => e.id === exercicioId);

  const [sets, setSets] = useState<SetState[]>(
    () =>
      exercise?.sets.map((s) => ({
        setNumber: s.setNumber,
        targetReps: s.targetReps,
        previousLoadKg: s.previousLoadKg,
        loadKg: s.targetLoadKg,
        completed: false,
        logId: null,
      })) ?? [],
  );

  // Séries com escrita em andamento — ignora toques repetidos no check.
  const busySets = useRef(new Set<number>());

  useEffect(() => {
    if (!exercicioId) return;
    let cancelled = false;
    setLogRepository.bySessionDate(todayIsoDate()).then((logs) => {
      if (cancelled) return;
      const mine = logs.filter((l) => l.exerciseId === exercicioId);
      if (mine.length === 0) return;
      setSets((prev) =>
        prev.map((s) => {
          const log = mine.find((l) => l.setNumber === s.setNumber);
          return log
            ? {
                ...s,
                completed: true,
                logId: log.id,
                loadKg: log.load.kg,
                previousLoadKg: log.previousLoad.kg,
              }
            : s;
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [exercicioId]);

  if (!exercise) {
    return (
      <Screen>
        <Text className="font-sans text-sm text-fog">
          Exercício não encontrado.
        </Text>
      </Screen>
    );
  }

  function update(setNumber: number, patch: Partial<SetState>) {
    setSets((prev) =>
      prev.map((s) => (s.setNumber === setNumber ? { ...s, ...patch } : s)),
    );
  }

  async function toggleSet(set: SetState) {
    if (busySets.current.has(set.setNumber)) return;
    busySets.current.add(set.setNumber);
    try {
      if (set.completed) {
        if (set.logId) await setLogRepository.remove([set.logId]);
        update(set.setNumber, { completed: false, logId: null });
      } else {
        const { setLog } = await registerSetUseCase.execute({
          exerciseId: exercise!.id,
          exerciseName: exercise!.name,
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          loadKg: set.loadKg,
        });
        update(set.setNumber, {
          completed: true,
          logId: setLog.id,
          previousLoadKg: setLog.previousLoad.kg,
        });
        if (session) void trySyncSetLogs(session.user.id);
      }
    } finally {
      busySets.current.delete(set.setNumber);
    }
  }

  return (
    <Screen>
      <View className="mb-6 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-glass-fill"
        >
          <ArrowLeft size={18} color={colors.paperForeground} />
        </Pressable>
        <View className="flex-1">
          <Text className="font-sans text-xs text-fog">
            {exercise.muscleGroup}
          </Text>
          <Text className="font-sans-semibold text-xl text-paper">
            {exercise.name}
          </Text>
        </View>
      </View>

      <View className="mb-4 flex-row items-center gap-1.5">
        <Timer size={13} color={colors.fogMuted} />
        <Text className="font-sans text-xs text-fog">Descanso:</Text>
        <Text className="font-mono text-xs text-paper">
          {exercise.restSeconds}
        </Text>
        <Text className="font-sans text-xs text-fog">s</Text>
      </View>

      <View className="gap-3">
        {sets.map((set) => {
          const delta = Load.fromKg(set.loadKg).deltaFrom(
            Load.fromKg(set.previousLoadKg),
          );
          return (
            <GlassCard key={set.setNumber} className="p-4">
              <View className="flex-row items-center gap-4">
                {/* check circular */}
                <Pressable
                  onPress={() => void toggleSet(set)}
                  className={`h-11 w-11 items-center justify-center rounded-full border ${
                    set.completed
                      ? "border-volt bg-volt"
                      : "border-hairline bg-glass-fill"
                  }`}
                >
                  {set.completed ? (
                    <Check size={18} color={colors.inkSurface} strokeWidth={3} />
                  ) : (
                    <Text className="font-mono text-xs text-fog">
                      {set.setNumber}
                    </Text>
                  )}
                </Pressable>

                {/* meta da série */}
                <View className="flex-1">
                  <View className="flex-row items-baseline gap-1">
                    <Text className="font-mono text-sm text-paper">
                      {set.targetReps}
                    </Text>
                    <Text className="font-sans text-xs text-fog">reps</Text>
                    {delta > 0 ? (
                      <Text className="ml-1 font-mono text-xs text-volt">
                        (+{delta})
                      </Text>
                    ) : null}
                  </View>
                  <View className="mt-0.5 flex-row items-baseline gap-1">
                    <Text className="font-sans text-[11px] text-fog">
                      anterior
                    </Text>
                    <Text className="font-mono text-[11px] text-fog">
                      {set.previousLoadKg}
                    </Text>
                    <Text className="font-sans text-[11px] text-fog">kg</Text>
                  </View>
                </View>

                {/* stepper de carga (travado com a série registrada — desmarque pra ajustar) */}
                <View
                  className={`flex-row items-center gap-2 ${set.completed ? "opacity-50" : ""}`}
                >
                  <Pressable
                    disabled={set.completed}
                    onPress={() =>
                      update(set.setNumber, {
                        loadKg: Load.fromKg(set.loadKg).decrement().kg,
                      })
                    }
                    className="h-9 w-9 items-center justify-center rounded-full border border-hairline bg-glass-fill active:scale-[0.95]"
                  >
                    <Minus size={14} color={colors.paperForeground} />
                  </Pressable>
                  <View className="min-w-14 items-center">
                    <Text className="font-mono text-base text-paper">
                      {set.loadKg}
                    </Text>
                    <Text className="font-sans text-[11px] text-fog">kg</Text>
                  </View>
                  <Pressable
                    disabled={set.completed}
                    onPress={() =>
                      update(set.setNumber, {
                        loadKg: Load.fromKg(set.loadKg).increment().kg,
                      })
                    }
                    className="h-9 w-9 items-center justify-center rounded-full border border-hairline bg-glass-fill active:scale-[0.95]"
                  >
                    <Plus size={14} color={colors.paperForeground} />
                  </Pressable>
                </View>
              </View>
            </GlassCard>
          );
        })}
      </View>
    </Screen>
  );
}
