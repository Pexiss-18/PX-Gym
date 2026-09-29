import { router, useLocalSearchParams } from "expo-router";
import { AtividadesFormScreen } from "@/adapters/screens/AtividadesFormScreen";
import { LocationGatewayExpo } from "@/adapters/gateways/LocationGatewayExpo";

const localizacao = new LocationGatewayExpo();

export default function AtividadesRoute() {
  const { cicloId } = useLocalSearchParams<{ cicloId: string }>();
  return <AtividadesFormScreen cicloId={cicloId} localizacao={localizacao} onVoltar={() => router.back()} />;
}
