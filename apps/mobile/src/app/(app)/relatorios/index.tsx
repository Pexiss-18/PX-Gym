import { router, useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { HistoricoRelatoriosScreen } from "@/adapters/screens/HistoricoRelatoriosScreen";
import { useAuth } from "@/adapters/hooks/useAuth";

export default function HistoricoRelatoriosRoute() {
  const navigation = useNavigation();
  const { sessao } = useAuth();
  // Aluno chega pelo menu lateral (volta pro app); personal e coordenação
  // têm aqui a tela inicial, sem pra onde voltar.
  const aluno = sessao?.usuario.papel === "aluno";
  return (
    <HistoricoRelatoriosScreen
      onAbrir={(cicloId) => router.push(`/relatorios/${cicloId}`)}
      onVoltar={
        aluno
          ? () => (router.canGoBack() ? router.back() : navigation.dispatch(DrawerActions.openDrawer()))
          : undefined
      }
    />
  );
}
