import { router, useLocalSearchParams } from "expo-router";
import { AssinaturaScreen } from "@/adapters/screens/AssinaturaScreen";

export default function AssinaturaRoute() {
  const { cicloId } = useLocalSearchParams<{ cicloId: string }>();
  return <AssinaturaScreen cicloId={cicloId} onVoltar={() => router.back()} />;
}
