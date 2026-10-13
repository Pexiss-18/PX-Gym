import { router, useLocalSearchParams } from "expo-router";
import { AtividadesFormScreen } from "@/adapters/screens/AtividadesFormScreen";
import { localizacao } from "@/adapters/instancia";

export default function AtividadesRoute() {
  const { cicloId } = useLocalSearchParams<{ cicloId: string }>();
  return <AtividadesFormScreen cicloId={cicloId} localizacao={localizacao} onVoltar={() => router.back()} />;
}
