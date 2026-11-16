import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import { colors } from "@px/tokens";
import type { Nivel, Objetivo, RegiaoSensivel, Sexo } from "@px/core";
import { Screen } from "@/components/screen";
import { BackButton } from "@/components/back-button";
import { GlassCard } from "@/components/glass-card";
import { Field } from "@/components/field";
import { PillButton } from "@/components/pill-button";
import { ChoiceChips } from "@/components/choice-chips";
import { useAuth } from "@/adapters/hooks/useAuth";
import { saveTrainingProfileUseCase, trainingProfileRepository } from "@/lib/plans";

const OBJETIVOS: { value: Objetivo; label: string }[] = [
  { value: "hipertrofia", label: "Ganhar massa" },
  { value: "emagrecimento", label: "Emagrecer" },
  { value: "forca", label: "Força" },
  { value: "condicionamento", label: "Condicionamento" },
  { value: "saude", label: "Saúde" },
];
const NIVEIS: { value: Nivel; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
];
const SEXOS: { value: Sexo; label: string }[] = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
];
const DIAS = [2, 3, 4, 5, 6].map((d) => ({ value: d, label: `${d}x` }));
const MINUTOS = [30, 45, 60, 75, 90].map((m) => ({ value: m, label: `${m} min` }));
const REGIOES: { value: RegiaoSensivel; label: string }[] = [
  { value: "ombro", label: "Ombro" },
  { value: "lombar", label: "Lombar" },
  { value: "joelho", label: "Joelho" },
  { value: "cotovelo", label: "Cotovelo" },
  { value: "punho", label: "Punho" },
];

/** AAAA-MM-DD ↔ DD/MM/AAAA, o jeito brasileiro de digitar. */
const paraTela = (iso: string) => iso.split("-").reverse().join("/");
function paraIso(texto: string): string {
  const br = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : texto.trim();
}

/**
 * Perfil de treino: o que a IA precisa saber pra montar o treino e a dieta.
 * As faixas são validadas no domínio (SaveTrainingProfileUseCase).
 */
export default function PerfilTreinoScreen() {
  const { sessao } = useAuth();
  const userId = sessao?.usuario.id;
  const [carregando, setCarregando] = useState(true);
  const [sexo, setSexo] = useState<Sexo | null>(null);
  const [nascimento, setNascimento] = useState("");
  const [altura, setAltura] = useState("");
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [dias, setDias] = useState<number | null>(null);
  const [minutos, setMinutos] = useState<number | null>(60);
  const [regioes, setRegioes] = useState<RegiaoSensivel[]>([]);
  const [restricoes, setRestricoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!userId) return;
    trainingProfileRepository
      .get(userId)
      .then((perfil) => {
        if (!perfil) return;
        setSexo(perfil.sex);
        setNascimento(paraTela(perfil.birthDate));
        setAltura(String(perfil.heightCm).replace(".", ","));
        setObjetivo(perfil.goal);
        setNivel(perfil.level);
        setDias(perfil.daysPerWeek);
        setMinutos(perfil.minutesPerSession);
        setRegioes(perfil.sensitiveRegions);
        setRestricoes(perfil.restrictions);
      })
      .catch(() => setErro("Não deu pra carregar seu perfil. Confira a internet."))
      .finally(() => setCarregando(false));
  }, [userId]);

  async function salvar() {
    if (!userId || salvando) return;
    if (!sexo || !objetivo || !nivel || !dias || !minutos || !nascimento.trim() || !altura.trim()) {
      setErro("Preencha todos os campos marcados com *.");
      return;
    }
    setErro(null);
    setSalvando(true);
    const resultado = await saveTrainingProfileUseCase.execute({
      userId,
      sex: sexo,
      birthDate: paraIso(nascimento),
      heightCm: Number(altura.trim().replace(",", ".")),
      goal: objetivo,
      level: nivel,
      daysPerWeek: dias,
      minutesPerSession: minutos,
      sensitiveRegions: regioes,
      restrictions: restricoes,
    });
    setSalvando(false);
    if (resultado.ok) router.back();
    else
      setErro(
        resultado.erro.tipo === "falha-externa"
          ? "Não deu pra salvar agora. Confira sua internet e tente de novo."
          : resultado.erro.mensagem,
      );
  }

  return (
    <Screen avoidKeyboard bottomInset={32}>
      <View className="mb-6 flex-row items-center gap-3">
        <BackButton />
        <View>
          <Text className="font-sans text-sm text-fog">Perfil</Text>
          <Text className="font-sans-semibold text-3xl text-paper">Perfil de treino</Text>
        </View>
      </View>

      {carregando ? (
        <View className="items-center py-16">
          <ActivityIndicator color={colors.voltLime} />
        </View>
      ) : (
        <>
          <Text className="mb-4 font-sans text-sm text-fog">
            É com isso que a IA monta o seu treino e a sua dieta, junto com a sua
            avaliação corporal.
          </Text>

          <GlassCard className="gap-5">
            <ChoiceChips label="Objetivo *" options={OBJETIVOS} value={objetivo} onChange={setObjetivo} />
            <ChoiceChips label="Experiência com musculação *" options={NIVEIS} value={nivel} onChange={setNivel} />
            <ChoiceChips label="Dias de treino por semana *" options={DIAS} value={dias} onChange={setDias} />
            <ChoiceChips label="Tempo por treino *" options={MINUTOS} value={minutos} onChange={setMinutos} />
          </GlassCard>

          <GlassCard className="mt-5 gap-5">
            <ChoiceChips label="Sexo *" options={SEXOS} value={sexo} onChange={setSexo} />
            <Field
              label="Data de nascimento *"
              value={nascimento}
              onChangeText={setNascimento}
              keyboardType="numbers-and-punctuation"
              placeholder="DD/MM/AAAA"
            />
            <Field
              label="Altura (cm) *"
              value={altura}
              onChangeText={setAltura}
              keyboardType="decimal-pad"
              placeholder="Ex.: 172"
            />
          </GlassCard>

          <GlassCard className="mt-5 gap-5">
            <ChoiceChips
              label="Tem dor ou lesão em alguma região?"
              options={REGIOES}
              multiple
              value={regioes}
              onChange={setRegioes}
            />
            <Field
              label="Outras restrições"
              value={restricoes}
              onChangeText={setRestricoes}
              placeholder="Ex.: desconforto no ombro direito acima da cabeça"
              multiline
            />
          </GlassCard>

          {erro ? <Text className="mt-4 font-sans text-sm text-protein">{erro}</Text> : null}

          <View className="mt-6">
            <PillButton onPress={salvar} loading={salvando}>
              Salvar perfil
            </PillButton>
          </View>
        </>
      )}
    </Screen>
  );
}
