import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { BookOpen, ChevronRight, Dumbbell, ScanLine, Timer } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { ProgressBar } from "@/components/progress-bar";
import { PillButton } from "@/components/pill-button";
import { Field } from "@/components/field";
import { useTodayDoneByExercise } from "@/lib/use-workout-data";
import { GeneratingCard, GenerationErrorMessage } from "@/components/generation-feedback";
import { NewAssessmentCard } from "@/components/new-assessment-card";
import { chooseDay, useTodayWorkout, useWorkoutGeneration } from "@/lib/use-workout-plan";

function Gerando() {
  return (
    <GeneratingCard
      title="Montando seu treino"
      description="A IA está usando sua avaliação, seu perfil e os artigos científicos do app. Pode levar até um minuto."
    />
  );
}

/**
 * Aba Treino: o dia de hoje do plano gerado pela IA, com as cargas vindas do
 * histórico. Sem plano, convida a gerar; com pedido na fila, oferece tentar
 * de novo. O plano fica guardado no aparelho e abre sem internet.
 */
export default function TreinoScreen() {
  const today = useTodayWorkout();
  const generation = useWorkoutGeneration();
  const doneByExercise = useTodayDoneByExercise();
  const [mudando, setMudando] = useState(false);
  const [pedido, setPedido] = useState("");
  // geração pedida pelo cartão da avaliação nova: o erro aparece lá em cima
  const [pelaAvaliacao, setPelaAvaliacao] = useState(false);

  if (today.status === "loading") {
    return (
      <Screen>
        <View className="items-center py-24">
          <ActivityIndicator color={colors.voltLime} />
        </View>
      </Screen>
    );
  }

  const { plan, workout } = today;

  if (!plan || !workout) {
    return (
      <Screen>
        <View className="mb-6">
          <Text className="font-sans text-sm text-fog">Treino</Text>
          <Text className="font-sans-semibold text-3xl text-paper">Seu treino</Text>
        </View>
        {generation.busy ? (
          <Gerando />
        ) : (
          <GlassCard className="py-8">
            <View className="items-center">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
                <Dumbbell size={24} color={colors.fogMuted} />
              </View>
              <Text className="mt-4 font-sans-semibold text-base text-paper">
                {today.queuedGenerationId ? "Seu pedido está na fila" : "Você ainda não tem um treino"}
              </Text>
              <Text className="mt-1 px-4 text-center font-sans text-sm text-fog">
                {today.queuedGenerationId
                  ? "A IA está com muitos pedidos agora. Tente de novo daqui a pouco: o pedido continua guardado."
                  : "A IA monta um treino pra você a partir da sua avaliação corporal e do seu perfil de treino."}
              </Text>
            </View>
            <View className="mt-6 px-2">
              {today.queuedGenerationId ? (
                <PillButton onPress={() => void generation.resume(today.queuedGenerationId!)}>
                  Tentar de novo
                </PillButton>
              ) : (
                <PillButton onPress={() => void generation.generate()}>Gerar meu treino</PillButton>
              )}
              {generation.error ? <GenerationErrorMessage error={generation.error} /> : null}
            </View>
          </GlassCard>
        )}
      </Screen>
    );
  }

  const totalSets = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const completedSets = workout.exercises.reduce(
    (n, e) => n + Math.min(doneByExercise.get(e.id) ?? 0, e.sets.length),
    0,
  );
  const fraction = totalSets === 0 ? 0 : completedSets / totalSets;

  async function enviarPedido() {
    setPelaAvaliacao(false);
    if (await generation.requestChange(pedido)) {
      setPedido("");
      setMudando(false);
    }
  }

  function gerarNovo() {
    Alert.alert(
      "Gerar um treino novo?",
      "O treino atual é substituído. Cada avaliação permite gerar poucos treinos do zero; pra ajustes, use “Pedir mudança”.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Gerar novo",
          onPress: () => {
            setPelaAvaliacao(false);
            void generation.generate();
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <View className="mb-6 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-sans text-sm text-fog">{workout.label}</Text>
          <Text className="font-sans-semibold text-3xl text-paper">{workout.name}</Text>
        </View>
        {/* QR do aparelho abre o exercício direto */}
        <Pressable
          onPress={() => router.push("/scanner")}
          className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-glass-fill"
        >
          <ScanLine size={18} color={colors.paperForeground} />
        </Pressable>
      </View>
      <View className="mb-5 -mt-4">
        <View className="mt-2 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Timer size={13} color={colors.fogMuted} />
            <Text className="font-mono text-xs text-fog">{workout.estimatedMinutes}</Text>
            <Text className="font-sans text-xs text-fog">min</Text>
          </View>
          <Text className="font-sans text-xs text-fog">{workout.focus}</Text>
        </View>
      </View>

      {generation.busy ? null : (
        <NewAssessmentCard
          part="treino"
          className="mb-5"
          planAssessmentId={plan.assessmentId}
          onUpdate={() => {
            setPelaAvaliacao(true);
            void generation.generate();
          }}
          error={pelaAvaliacao ? generation.error : null}
        />
      )}

      {/* troca de dia: o sugerido pelo histórico leva "hoje" */}
      {plan.days.length > 1 ? (
        <View className="mb-5 flex-row flex-wrap gap-2">
          {plan.days.map((dia, i) => {
            const on = i === today.dayIndex;
            return (
              <Pressable
                key={dia.label}
                onPress={() => chooseDay(i === today.suggestedDay ? null : i)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                className={`rounded-full border px-4 py-2 ${on ? "border-volt bg-volt" : "border-hairline bg-glass-fill"}`}
              >
                <Text className={`font-sans-medium text-sm ${on ? "text-surface" : "text-paper"}`}>
                  {dia.label}
                  {i === today.suggestedDay ? " · hoje" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View className="mb-5 flex-row items-center gap-3">
        <View className="flex-1">
          <ProgressBar fraction={fraction} color={colors.voltLime} />
        </View>
        <View className="flex-row items-baseline gap-0.5">
          <Text className="font-mono text-sm text-volt">{completedSets}</Text>
          <Text className="font-sans text-sm text-fog">/</Text>
          <Text className="font-mono text-sm text-fog">{totalSets}</Text>
        </View>
      </View>

      <View className="gap-4">
        {workout.exercises.map((exercise) => {
          const done = Math.min(doneByExercise.get(exercise.id) ?? 0, exercise.sets.length);
          const reps = exercise.sets[0]?.targetReps ?? 0;
          return (
            <Link
              key={exercise.id}
              href={{ pathname: "/treino/[exercicioId]", params: { exercicioId: exercise.id } }}
              asChild
            >
              <Pressable className="active:scale-[0.99]">
                <GlassCard>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="font-sans text-xs text-fog">{exercise.muscleGroup}</Text>
                      <Text className="mt-0.5 font-sans-semibold text-base text-paper">{exercise.name}</Text>
                      <View className="mt-2 flex-row items-center gap-1">
                        <Text className="font-mono text-xs text-paper">{done}</Text>
                        <Text className="font-sans text-xs text-fog">de</Text>
                        <Text className="font-mono text-xs text-fog">{exercise.sets.length}</Text>
                        <Text className="font-sans text-xs text-fog">séries ·</Text>
                        <Text className="font-mono text-xs text-fog">{reps}</Text>
                        <Text className="font-sans text-xs text-fog">reps</Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={colors.fogMuted} />
                  </View>
                </GlassCard>
              </Pressable>
            </Link>
          );
        })}
      </View>

      {/* por que este treino */}
      <GlassCard className="mt-6">
        <View className="flex-row items-center gap-2">
          <BookOpen size={16} color={colors.fogMuted} />
          <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">Por que este treino</Text>
        </View>
        <Text className="mt-2 font-sans-semibold text-base text-paper">{plan.name}</Text>
        <Text className="mt-1 font-sans text-sm text-fog">{plan.rationale}</Text>
        {plan.sources.length > 0 ? (
          <Text className="mt-3 font-sans text-xs text-fog">
            Baseado em {plan.sources.length} {plan.sources.length === 1 ? "artigo científico" : "artigos científicos"} do acervo do app.
          </Text>
        ) : null}
      </GlassCard>

      {/* ajustes pela IA */}
      <View className="mt-6 gap-3">
        {generation.busy ? (
          <Gerando />
        ) : mudando ? (
          <GlassCard className="gap-3">
            <Field
              label="O que você quer mudar?"
              value={pedido}
              onChangeText={setPedido}
              placeholder="Ex.: minha academia não tem leg press"
              multiline
              autoFocus
            />
            <PillButton onPress={() => void enviarPedido()}>Enviar pedido</PillButton>
            <PillButton variant="ghost" onPress={() => setMudando(false)}>
              Cancelar
            </PillButton>
          </GlassCard>
        ) : (
          <>
            <PillButton variant="ghost" onPress={() => setMudando(true)}>
              Pedir mudança no treino
            </PillButton>
            <PillButton variant="ghost" onPress={gerarNovo}>
              Gerar um treino novo
            </PillButton>
          </>
        )}
        {generation.error && !generation.busy && !pelaAvaliacao ? (
          <GenerationErrorMessage error={generation.error} />
        ) : null}
      </View>
    </Screen>
  );
}
