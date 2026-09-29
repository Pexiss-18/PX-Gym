import { router, useLocalSearchParams } from "expo-router";
import { RelatorioScreen } from "@/adapters/screens/RelatorioScreen";

export default function RelatorioRoute() {
  const { cicloId } = useLocalSearchParams<{ cicloId: string }>();
  return (
    <RelatorioScreen
      cicloId={cicloId}
      onVoltar={() => (router.canGoBack() ? router.back() : router.replace("/relatorios"))}
      onRegistrarTreino={() => router.push(`/relatorios/${cicloId}/atividades`)}
      onAvaliar={() => router.push(`/relatorios/${cicloId}/avaliacao`)}
      onAssinar={() => router.push(`/relatorios/${cicloId}/assinatura`)}
    />
  );
}
