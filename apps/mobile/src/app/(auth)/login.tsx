import { router } from "expo-router";
import { LoginScreen } from "@/adapters/screens/LoginScreen";
import { CONTAS_DEMO } from "@/adapters/instancia";

/** Rota = fronteira: só traduz navegação em props da tela. */
export default function LoginRoute() {
  return (
    <LoginScreen
      contasDemo={CONTAS_DEMO}
      onCriarConta={() => router.push("/cadastro")}
      onAcessoPersonal={() => router.push("/token")}
    />
  );
}
