import { useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { CloudOff, Salad } from "lucide-react-native";
import { colors } from "@px/tokens";
import type { MacroTarget } from "@px/core";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { Readout } from "@/components/readout";
import { Field } from "@/components/field";
import { WeeklyMenu } from "@/components/weekly-menu";
import { PillButton } from "@/components/pill-button";
import { GeneratingCard, GenerationErrorMessage } from "@/components/generation-feedback";
import { NewAssessmentCard } from "@/components/new-assessment-card";
import { useLatestPlan } from "@/lib/remote";
import { useDietGeneration } from "@/lib/use-diet-plan";

function Gerando() {
  return (
    <GeneratingCard
      title="Montando sua dieta"
      description="A IA está usando sua avaliação, seu perfil e os artigos científicos do app. Pode levar até um minuto."
    />
  );
}

const MACROS = [
  ["protein", "Proteína", colors.proteinCoral],
  ["carbs", "Carboidrato", colors.carbsAmber],
  ["fat", "Gordura", colors.fatViolet],
] as const;

function MacroRow({
  label,
  color,
  target,
}: {
  label: string;
  color: string;
  target: MacroTarget;
}) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <Text className="font-sans text-sm text-paper">{label}</Text>
        </View>
        <Readout value={target.grams} unit="g / dia" size={16} />
      </View>
      <Text className="mt-1.5 pl-4 font-sans text-xs leading-5 text-fog">
        {target.rationale}
      </Text>
    </View>
  );
}

/**
 * Plano nutricional: alvos e orientações gerados pela IA (Edge Function
 * generate-plan, parte "nutrition") a partir da avaliação e do perfil. Sem
 * dieta, convida a gerar; com dieta, deixa pedir mudança ou gerar outra.
 * Registro de refeições fica pra uma etapa futura.
 */
export default function NutricaoScreen() {
  const remoto = useLatestPlan();
  const dieta = useDietGeneration();
  const [mudando, setMudando] = useState(false);
  const [pedido, setPedido] = useState("");
  // geração pedida pelo cartão da avaliação nova: o erro aparece lá em cima
  const [pelaAvaliacao, setPelaAvaliacao] = useState(false);
  // a dieta que acabou de sair vale até a tela recarregar do servidor
  const plano = dieta.generated ?? remoto.data;

  async function enviarPedido() {
    setPelaAvaliacao(false);
    if (await dieta.requestChange(pedido)) {
      setPedido("");
      setMudando(false);
    }
  }

  function gerarNova() {
    Alert.alert(
      "Gerar uma dieta nova?",
      "A dieta atual é substituída. Cada avaliação permite gerar poucas dietas do zero; pra ajustes, use “Pedir mudança”.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Gerar nova",
          onPress: () => {
            setPelaAvaliacao(false);
            void dieta.generate();
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <View className="mb-6">
        <Text className="font-sans text-sm text-fog">Nutrição</Text>
        <Text className="font-sans-semibold text-3xl text-paper">
          Seu plano
        </Text>
      </View>

      {remoto.status === "loading" && !plano ? (
        <View className="items-center py-16">
          <ActivityIndicator color={colors.voltLime} />
        </View>
      ) : remoto.status === "error" && !plano ? (
        <GlassCard className="items-center py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
            <CloudOff size={24} color={colors.fogMuted} />
          </View>
          <Text className="mt-4 font-sans-semibold text-base text-paper">
            Sem conexão com o servidor
          </Text>
          <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
            Verifique sua internet — o plano recarrega sozinho quando você
            voltar pra esta tela.
          </Text>
        </GlassCard>
      ) : !plano ? (
        dieta.busy ? (
          <Gerando />
        ) : (
          <GlassCard className="py-8">
            <View className="items-center">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
                <Salad size={24} color={colors.fogMuted} />
              </View>
              <Text className="mt-4 font-sans-semibold text-base text-paper">
                {dieta.queuedGenerationId ? "Seu pedido está na fila" : "Você ainda não tem uma dieta"}
              </Text>
              <Text className="mt-1 px-4 text-center font-sans text-sm text-fog">
                {dieta.queuedGenerationId
                  ? "A IA está com muitos pedidos agora. Tente de novo daqui a pouco: o pedido continua guardado."
                  : "A IA monta suas metas de calorias e macros a partir da sua avaliação corporal e do seu perfil."}
              </Text>
            </View>
            <View className="mt-6 px-2">
              {dieta.queuedGenerationId ? (
                <PillButton onPress={() => void dieta.resume(dieta.queuedGenerationId!)}>
                  Tentar de novo
                </PillButton>
              ) : (
                <PillButton onPress={() => void dieta.generate()}>Gerar minha dieta</PillButton>
              )}
              {dieta.error ? <GenerationErrorMessage error={dieta.error} /> : null}
            </View>
          </GlassCard>
        )
      ) : (
        <View className="gap-5">
          {dieta.busy ? null : (
            <NewAssessmentCard
              part="dieta"
              planAssessmentId={plano.assessmentId}
              onUpdate={() => {
                setPelaAvaliacao(true);
                void dieta.generate();
              }}
              error={pelaAvaliacao ? dieta.error : null}
            />
          )}
          <GlassCard>
            <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
              Meta diária
            </Text>
            <View className="mt-2">
              <Readout
                value={plano.caloriesTarget}
                unit="kcal / dia"
                size={28}
              />
            </View>
          </GlassCard>

          <GlassCard>
            <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
              Macros
            </Text>
            <View className="mt-4 gap-5">
              {MACROS.map(([key, label, color]) => (
                <MacroRow
                  key={key}
                  label={label}
                  color={color}
                  target={plano.macros[key]}
                />
              ))}
            </View>
          </GlassCard>

          {plano.meals && plano.meals.length > 0 ? (
            <WeeklyMenu key={plano.id} meals={plano.meals} />
          ) : (
            // Dieta de antes das refeições: monta o cardápio como pedido de
            // mudança (mantém as metas e não gasta uma das gerações do zero).
            dieta.busy ? (
              <Gerando />
            ) : (
              <GlassCard>
                <Text className="font-sans-semibold text-base text-paper">
                  Monte seu cardápio da semana
                </Text>
                <Text className="mt-1 font-sans text-sm leading-6 text-fog">
                  Sua dieta tem as metas, mas ainda não tem o que comer. A IA
                  monta as refeições de segunda a domingo, mantendo essas metas.
                </Text>
                <View className="mt-4">
                  <PillButton
                    onPress={() =>
                      void dieta.requestChange(
                        "Montar o cardápio com as opções de cada refeição, mantendo as mesmas metas.",
                      )
                    }
                  >
                    Montar meu cardápio
                  </PillButton>
                </View>
                {dieta.error ? <GenerationErrorMessage error={dieta.error} /> : null}
              </GlassCard>
            )
          )}

          {plano.micros.length > 0 ? (
            <GlassCard>
              <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
                Micronutrientes
              </Text>
              <View className="mt-3 gap-3">
                {plano.micros.map((micro) => (
                  <View
                    key={micro.name}
                    className="flex-row items-baseline justify-between"
                  >
                    <Text className="font-sans text-sm text-paper">
                      {micro.name}
                    </Text>
                    <Readout
                      value={micro.targetAmount}
                      unit={micro.unit}
                      size={14}
                    />
                  </View>
                ))}
              </View>
            </GlassCard>
          ) : null}

          <GlassCard>
            <Text className="font-sans-medium text-xs uppercase tracking-wide text-fog">
              Orientações
            </Text>
            <Text className="mt-3 font-sans text-sm leading-6 text-paper">
              {plano.dietGuidance}
            </Text>
            <Text className="mt-4 font-sans text-[11px] text-fog">
              Gerado em{" "}
              {plano.createdAt.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </GlassCard>

          {/* ajustes pela IA */}
          <View className="mt-1 gap-3">
            {dieta.busy ? (
              <Gerando />
            ) : mudando ? (
              <GlassCard className="gap-3">
                <Field
                  label="O que você quer mudar?"
                  value={pedido}
                  onChangeText={setPedido}
                  placeholder="Ex.: não como carne vermelha"
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
                  Pedir mudança na dieta
                </PillButton>
                <PillButton variant="ghost" onPress={gerarNova}>
                  Gerar uma dieta nova
                </PillButton>
              </>
            )}
            {dieta.error && !dieta.busy && !pelaAvaliacao ? (
              <GenerationErrorMessage error={dieta.error} />
            ) : null}
          </View>
        </View>
      )}
    </Screen>
  );
}
