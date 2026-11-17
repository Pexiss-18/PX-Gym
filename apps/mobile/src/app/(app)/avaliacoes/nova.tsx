import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { FileText } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { BackButton } from "@/components/back-button";
import { GlassCard } from "@/components/glass-card";
import { Field } from "@/components/field";
import { DateField } from "@/components/date-field";
import { PillButton } from "@/components/pill-button";
import { useAuth } from "@/adapters/hooks/useAuth";
import { readAssessmentPdfUseCase, registerManualAssessmentUseCase } from "@/lib/remote";
import { formularioDoPdf, MEDIDAS } from "@/lib/assessment-form";

/** "" vira null; vírgula vale como decimal; texto que não é número vira NaN (o domínio recusa). */
function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  return limpo === "" ? null : Number(limpo);
}

/**
 * Nova avaliação, de dois jeitos: enviando o PDF (a IA lê e preenche os
 * campos pra pessoa conferir) ou digitando. Só o peso é obrigatório. A
 * validação é do domínio (RegisterManualAssessmentUseCase); a tela só
 * converte o texto.
 */
export default function NovaAvaliacaoScreen() {
  const { sessao } = useAuth();
  const [peso, setPeso] = useState("");
  const [gordura, setGordura] = useState("");
  const [musculo, setMusculo] = useState("");
  const [data, setData] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [medidas, setMedidas] = useState<Record<string, string>>({});
  /** Medidas do PDF que não têm campo padrão (ex.: Braço esquerdo). */
  const [extras, setExtras] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [lendoPdf, setLendoPdf] = useState(false);
  const [erroDoPdf, setErroDoPdf] = useState<string | null>(null);
  /** PDF lido e guardado; vai junto da avaliação quando a pessoa salvar. */
  const [pdf, setPdf] = useState<{ path: string; nome: string } | null>(null);

  async function enviarPdf() {
    if (!sessao || lendoPdf) return;
    const escolha = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    const arquivo = escolha.canceled ? null : escolha.assets[0];
    if (!arquivo) return;

    setErroDoPdf(null);
    setLendoPdf(true);
    try {
      const bytes = new Uint8Array(await new File(arquivo.uri).arrayBuffer());
      const r = await readAssessmentPdfUseCase.execute(sessao.usuario.id, bytes);
      if (!r.ok) {
        setErroDoPdf(
          r.erro.tipo === "falha-externa" && !/internet/i.test(r.erro.mensagem)
            ? "Não consegui ler esse PDF agora. Tente de novo ou digite os números."
            : r.erro.mensagem,
        );
        return;
      }
      const f = formularioDoPdf(r.valor.extracted);
      setPeso(f.peso);
      setGordura(f.gordura);
      setMusculo(f.musculo);
      setData(f.data);
      setObservacoes(f.observacoes);
      setMedidas(f.medidas);
      setExtras(f.extras);
      setPdf({ path: r.valor.pdfPath, nome: arquivo.name });
    } catch {
      setErroDoPdf("Não consegui abrir esse arquivo. Tente de novo.");
    } finally {
      setLendoPdf(false);
    }
  }

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
      assessmentDate: data || null, // vazio = hoje
      notes: observacoes,
      pdfPath: pdf?.path ?? null,
      measurements: [...MEDIDAS, ...extras].map((label) => ({
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

      {/* jeito 1: o PDF da bioimpedância, lido pela IA */}
      <GlassCard className="mb-6">
        {lendoPdf ? (
          <View className="items-center py-4">
            <ActivityIndicator color={colors.voltLime} />
            <Text className="mt-3 font-sans-semibold text-base text-paper">Lendo seu PDF</Text>
            <Text className="mt-1 text-center font-sans text-sm text-fog">
              A IA está tirando os números do laudo. Leva uns segundos.
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-glass-strong">
                <FileText size={18} color={pdf ? colors.voltLime : colors.fogMuted} />
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-base text-paper">
                  {pdf ? "PDF lido" : "Tem o PDF da avaliação?"}
                </Text>
                <Text className="font-sans text-xs text-fog" numberOfLines={1}>
                  {pdf ? pdf.nome : "Bioimpedância, InBody, laudo do personal"}
                </Text>
              </View>
            </View>
            <Text className="mt-3 font-sans text-sm leading-5 text-fog">
              {pdf
                ? "Os campos abaixo foram preenchidos com o que a IA leu. Confira cada número antes de salvar: ela pode errar."
                : "A IA lê os números e preenche tudo aqui embaixo. Você confere antes de salvar."}
            </Text>
            <View className="mt-4">
              <PillButton variant={pdf ? "ghost" : "primary"} onPress={() => void enviarPdf()}>
                {pdf ? "Enviar outro PDF" : "Enviar PDF"}
              </PillButton>
            </View>
            {erroDoPdf ? (
              <Text className="mt-3 font-sans text-sm text-protein">{erroDoPdf}</Text>
            ) : null}
          </>
        )}
      </GlassCard>

      <Text className="mb-4 font-sans text-sm text-fog">
        {pdf
          ? "Confira os números. Só o peso é obrigatório."
          : "Ou digite os números da sua avaliação. Só o peso é obrigatório; o resto ajuda a montar um treino e uma dieta mais certos."}
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
        <DateField
          label="Data da avaliação"
          value={data}
          onChange={setData}
          placeholder="Hoje"
        />
      </GlassCard>

      <Text className="mb-3 mt-6 font-sans-semibold text-base text-paper">
        Medidas (cm)
      </Text>
      <GlassCard className="gap-4">
        {[...MEDIDAS, ...extras].map((label) => (
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
