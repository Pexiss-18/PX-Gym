import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/screen";
import { BackButton } from "@/components/back-button";
import { GlassCard } from "@/components/glass-card";
import { Field } from "@/components/field";
import { PillButton } from "@/components/pill-button";
import { useAuth } from "@/adapters/hooks/useAuth";
import { registerManualAssessmentUseCase } from "@/lib/remote";

/** Medidas mais comuns numa avaliação com personal; todas opcionais. */
const MEDIDAS = ["Peito", "Cintura", "Abdômen", "Quadril", "Braço", "Coxa", "Panturrilha"];

/** "" vira null; vírgula vale como decimal; texto que não é número vira NaN (o domínio recusa). */
function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  return limpo === "" ? null : Number(limpo);
}

/** Aceita DD/MM/AAAA (o jeito brasileiro) e entrega AAAA-MM-DD; vazio = hoje. */
function lerData(texto: string): string | null {
  const limpo = texto.trim();
  if (limpo === "") return null;
  const br = limpo.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : limpo;
}

/**
 * Avaliação digitada pela pessoa — quem fez a avaliação com um personal e
 * não tem PDF. Só o peso é obrigatório. A validação é do domínio
 * (RegisterManualAssessmentUseCase); a tela só converte o texto.
 */
export default function NovaAvaliacaoScreen() {
  const { sessao } = useAuth();
  const [peso, setPeso] = useState("");
  const [gordura, setGordura] = useState("");
  const [musculo, setMusculo] = useState("");
  const [data, setData] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [medidas, setMedidas] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!sessao || salvando) return;
    const weightKg = lerNumero(peso);
    if (weightKg === null) {
      setErro("Informe pelo menos o peso.");
      return;
    }
    setErro(null);
    setSalvando(true);
    const resultado = await registerManualAssessmentUseCase.execute({
      userId: sessao.usuario.id,
      weightKg,
      bodyFatPct: lerNumero(gordura),
      muscleMassKg: lerNumero(musculo),
      assessmentDate: lerData(data),
      notes: observacoes,
      measurements: MEDIDAS.map((label) => ({
        label,
        valueCm: lerNumero(medidas[label] ?? ""),
      })),
    });
    setSalvando(false);

    if (resultado.ok) {
      router.back();
    } else {
      setErro(
        resultado.erro.tipo === "falha-externa"
          ? "Não deu pra salvar agora. Confira sua internet e tente de novo."
          : resultado.erro.mensagem,
      );
    }
  }

  return (
    <Screen avoidKeyboard bottomInset={32}>
      <View className="mb-6 flex-row items-center gap-3">
        <BackButton />
        <View>
          <Text className="font-sans text-sm text-fog">Avaliações</Text>
          <Text className="font-sans-semibold text-3xl text-paper">
            Nova avaliação
          </Text>
        </View>
      </View>

      <Text className="mb-4 font-sans text-sm text-fog">
        Digite os números da sua avaliação com o personal. Só o peso é
        obrigatório; o resto ajuda a montar um treino e uma dieta mais certos.
      </Text>

      <GlassCard className="gap-4">
        <Field
          label="Peso (kg) *"
          value={peso}
          onChangeText={setPeso}
          keyboardType="decimal-pad"
          placeholder="Ex.: 78,5"
        />
        <Field
          label="Gordura corporal (%)"
          value={gordura}
          onChangeText={setGordura}
          keyboardType="decimal-pad"
          placeholder="Ex.: 18"
        />
        <Field
          label="Massa muscular (kg)"
          value={musculo}
          onChangeText={setMusculo}
          keyboardType="decimal-pad"
          placeholder="Ex.: 34"
        />
        <Field
          label="Data da avaliação"
          value={data}
          onChangeText={setData}
          keyboardType="numbers-and-punctuation"
          placeholder="Hoje (ou DD/MM/AAAA)"
        />
      </GlassCard>

      <Text className="mb-3 mt-6 font-sans-semibold text-base text-paper">
        Medidas (cm)
      </Text>
      <GlassCard className="gap-4">
        {MEDIDAS.map((label) => (
          <Field
            key={label}
            label={label}
            value={medidas[label] ?? ""}
            onChangeText={(texto) =>
              setMedidas((atual) => ({ ...atual, [label]: texto }))
            }
            keyboardType="decimal-pad"
          />
        ))}
      </GlassCard>

      <View className="mt-6">
        <Field
          label="Observações"
          value={observacoes}
          onChangeText={setObservacoes}
          placeholder="Opcional"
          multiline
        />
      </View>

      {erro ? (
        <Text className="mt-4 font-sans text-sm text-protein">{erro}</Text>
      ) : null}

      <View className="mt-6">
        <PillButton onPress={salvar} loading={salvando}>
          Salvar avaliação
        </PillButton>
      </View>
    </Screen>
  );
}
