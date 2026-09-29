import { router, useLocalSearchParams } from "expo-router";
import { AvaliacaoScreen } from "@/adapters/screens/AvaliacaoScreen";

export default function AvaliacaoRoute() {
  const { cicloId } = useLocalSearchParams<{ cicloId: string }>();
  return <AvaliacaoScreen cicloId={cicloId} onVoltar={() => router.back()} />;
}
