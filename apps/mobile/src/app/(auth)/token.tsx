import { router } from "expo-router";
import { AcessoTokenScreen } from "@/adapters/screens/AcessoTokenScreen";

export default function TokenRoute() {
  return <AcessoTokenScreen onVoltar={() => router.back()} />;
}
