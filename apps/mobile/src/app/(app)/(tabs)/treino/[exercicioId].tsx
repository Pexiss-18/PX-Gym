import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Check, Minus, Plus, Timer, X } from "lucide-react-native";
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
  unregisterSetUseCase,
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
 * tenta um sync oportunista; desmarcar usa o UnregisterSetUseCase (pending
 * some direto, synced vira tombstone até o backend confirmar a remoção). O
 * estado do dia é hidratado do banco, então fechar e reabrir não perde nada.
 *
 * Polimento da etapa 8: haptics no check/steppers, scale-bounce no círculo
 * (DESIGN.md, Set Row) e timer de descanso que dispara ao completar a série.
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

  // Timer de descanso: dispara ao completar uma série, toque no chip pula.
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!restEndsAt) return;
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  const restLeft =
    restEndsAt !== null
      ? Math.max(0, Math.ceil((restEndsAt - nowMs) / 1000))
      : null;

  useEffect(() => {
    if (restEndsAt !== null && restLeft === 0) {
      setRestEndsAt(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [restEndsAt, restLeft]);

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
        if (set.logId) {
          // pending some direto; synced vira tombstone e o sync apaga no Supabase
          await unregisterSetUseCase.execute({ logId: set.logId });
          if (session) void trySyncSetLogs(session.user.id);
        }
        update(set.setNumber, { completed: false, logId: null });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        const now = Date.now();
        setNowMs(now);
        setRestEndsAt(now + exercise!.restSeconds * 1000);
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

      {restLeft !== null ? (
        <Pressable
          onPress={() => {
            setRestEndsAt(null);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          className="mb-4 flex-row items-center justify-between rounded-full border border-volt bg-glass-fill px-4 py-2.5"
        >
          <View className="flex-row items-center gap-2">
            <Timer size={14} color={colors.voltLime} />
            <Text className="font-sans text-xs text-fog">Descanso</Text>
            <Text className="font-mono text-sm text-volt">
              {formatRest(restLeft)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="font-sans text-[11px] text-fog">pular</Text>
            <X size={12} color={colors.fogMuted} />
          </View>
        </Pressable>
      ) : (
        <View className="mb-4 flex-row items-center gap-1.5">
          <Timer size={13} color={colors.fogMuted} />
          <Text className="font-sans text-xs text-fog">Descanso:</Text>
          <Text className="font-mono text-xs text-paper">
            {exercise.restSeconds}
          </Text>
          <Text className="font-sans text-xs text-fog">s</Text>
        </View>
      )}

      <View className="gap-3">
        {sets.map((set) => {
          const delta = Load.fromKg(set.loadKg).deltaFrom(
            Load.fromKg(set.previousLoadKg),
          );
          return (
            <GlassCard key={set.setNumber} className="p-4">
              <View className="flex-row items-center gap-4">
                <SetCheck
                  completed={set.completed}
                  setNumber={set.setNumber}
                  onPress={() => void toggleSet(set)}
                />

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
                    onPress={() => {
                      void Haptics.selectionAsync();
                      update(set.setNumber, {
                        loadKg: Load.fromKg(set.loadKg).decrement().kg,
                      });
                    }}
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
                    onPress={() => {
                      void Haptics.selectionAsync();
                      update(set.setNumber, {
                        loadKg: Load.fromKg(set.loadKg).increment().kg,
                      });
                    }}
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

/** mm:ss do descanso restante. */
function formatRest(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Check circular do Set Row com o scale-bounce do DESIGN.md: encolhe e volta
 * em spring quando a série é completada. O transform fica num Animated.View
 * externo pra não misturar estilo animado com as classes do NativeWind.
 */
function SetCheck({
  completed,
  setNumber,
  onPress,
}: {
  completed: boolean;
  setNumber: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasCompleted = useRef(completed);

  useEffect(() => {
    if (completed && !wasCompleted.current) {
      scale.setValue(0.6);
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: true,
      }).start();
    }
    wasCompleted.current = completed;
  }, [completed, scale]);

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          className={`h-11 w-11 items-center justify-center rounded-full border ${
            completed ? "border-volt bg-volt" : "border-hairline bg-glass-fill"
          }`}
        >
          {completed ? (
            <Check size={18} color={colors.inkSurface} strokeWidth={3} />
          ) : (
            <Text className="font-mono text-xs text-fog">{setNumber}</Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}
