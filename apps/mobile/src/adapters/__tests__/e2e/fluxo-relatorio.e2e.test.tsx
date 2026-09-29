import { useEffect, useState } from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { geoPoint } from "@px/core";
import { FakeLocation } from "@px/core/testing/fakes";
import { useAuth } from "../../hooks/useAuth";
import { AcessoTokenScreen } from "../../screens/AcessoTokenScreen";
import { AssinaturaScreen } from "../../screens/AssinaturaScreen";
import { AtividadesFormScreen } from "../../screens/AtividadesFormScreen";
import { AvaliacaoScreen } from "../../screens/AvaliacaoScreen";
import { HistoricoRelatoriosScreen } from "../../screens/HistoricoRelatoriosScreen";
import { LoginScreen } from "../../screens/LoginScreen";
import { RelatorioScreen } from "../../screens/RelatorioScreen";
import { SENHA_DEMO } from "../../memoria/gateways-simulados";
import { montar } from "../utils/montar";

/*
 * E2E do fluxo crítico (um só, de propósito — a pirâmide pede poucos):
 * aluno registra, se avalia e assina → personal entra por token, avalia e
 * assina → coordenação aprova, sincroniza e gera o PDF.
 *
 * Roda o app de verdade (Context + hooks + use cases + domínio + repos em
 * memória); só a navegação do Expo Router é trocada por um roteador mínimo
 * com o mesmo contrato das rotas em src/app.
 */

type Rota =
  | { tela: "historico" }
  | { tela: "relatorio" | "atividades" | "avaliacao" | "assinatura"; cicloId: string };

const gps = new FakeLocation("granted", geoPoint(-19.9245, -43.9352, Date.UTC(2026, 8, 29, 13)));

function AppDeTeste() {
  const { sessao } = useAuth();
  const [rota, setRota] = useState<Rota>({ tela: "historico" });
  const [publica, setPublica] = useState<"login" | "token">("login");

  // Como o Stack.Protected do layout raiz: trocou a sessão, volta pro começo.
  useEffect(() => {
    setRota({ tela: "historico" });
    setPublica("login");
  }, [sessao]);

  if (!sessao) {
    return publica === "login" ? (
      <LoginScreen onCriarConta={() => undefined} onAcessoPersonal={() => setPublica("token")} />
    ) : (
      <AcessoTokenScreen onVoltar={() => setPublica("login")} />
    );
  }

  const voltarProRelatorio = () => rota.tela !== "historico" && setRota({ tela: "relatorio", cicloId: rota.cicloId });
  switch (rota.tela) {
    case "historico":
      return <HistoricoRelatoriosScreen onAbrir={(cicloId) => setRota({ tela: "relatorio", cicloId })} />;
    case "relatorio":
      return (
        <RelatorioScreen
          cicloId={rota.cicloId}
          onVoltar={() => setRota({ tela: "historico" })}
          onRegistrarTreino={() => setRota({ tela: "atividades", cicloId: rota.cicloId })}
          onAvaliar={() => setRota({ tela: "avaliacao", cicloId: rota.cicloId })}
          onAssinar={() => setRota({ tela: "assinatura", cicloId: rota.cicloId })}
        />
      );
    case "atividades":
      return <AtividadesFormScreen cicloId={rota.cicloId} localizacao={gps} onVoltar={voltarProRelatorio} hoje="2026-09-24" />;
    case "avaliacao":
      return <AvaliacaoScreen cicloId={rota.cicloId} onVoltar={voltarProRelatorio} />;
    case "assinatura":
      return <AssinaturaScreen cicloId={rota.cicloId} onVoltar={voltarProRelatorio} />;
  }
}

const botao = (nome: string | RegExp) => screen.getByRole("button", { name: nome });
const tocar = async (nome: string | RegExp) => fireEvent.press(await screen.findByRole("button", { name: nome }));

async function entrar(email: string) {
  await fireEvent.changeText(await screen.findByLabelText("E-mail"), email);
  await fireEvent.changeText(screen.getByLabelText("Senha"), SENHA_DEMO);
  await fireEvent.press(botao("Entrar"));
}

async function assinar() {
  const quadro = await screen.findByTestId("quadro-assinatura");
  await fireEvent(quadro, "responderGrant", { nativeEvent: { locationX: 20, locationY: 110 } });
  for (const [x, y] of [[80, 50], [140, 120], [210, 60], [280, 100]]) {
    await fireEvent(quadro, "responderMove", { nativeEvent: { locationX: x, locationY: y } });
  }
  await fireEvent.press(botao("Confirmar assinatura"));
}

async function sair() {
  await fireEvent.press(botao("Voltar"));
  await tocar("Sair");
}

it("E2E: do primeiro treino ao PDF aprovado, passando pelos três papéis", async () => {
  const { renderizar } = montar();
  await renderizar(<AppDeTeste />);

  // ── ALUNO ─────────────────────────────────────────────────────────────
  await entrar("aluno@pxgym.dev");
  await tocar("Abrir Ciclo de setembro — Hipertrofia");
  expect(await screen.findByText("6h / 12h")).toBeTruthy();

  await tocar("Registrar treino");
  await fireEvent.press(screen.getByLabelText("Marcar check-in por GPS"));
  await screen.findByText(/Check-in: -19.9245/);
  await fireEvent.changeText(screen.getByLabelText("O que você treinou"), "Treino C — pernas pesado");
  await fireEvent.changeText(screen.getByLabelText("Duração em horas"), "3");
  await fireEvent.press(botao("Adicionar à lista"));
  await fireEvent.changeText(screen.getByLabelText("Data (AAAA-MM-DD)"), "2026-09-26");
  await fireEvent.changeText(screen.getByLabelText("O que você treinou"), "Treino A — superiores");
  await fireEvent.changeText(screen.getByLabelText("Duração em horas"), "3");
  await fireEvent.press(botao("Adicionar à lista"));
  await fireEvent.press(botao("Salvar 2 treinos"));
  await screen.findByText("Treinos salvos no relatório.");
  await fireEvent.press(botao("Voltar"));

  expect(await screen.findByText("12h / 12h")).toBeTruthy();
  expect(screen.getByText("Mínimo do ciclo cumprido.")).toBeTruthy();

  await tocar("Fazer autoavaliação");
  await fireEvent.press(screen.getByLabelText("Aumentar Disciplina"));
  await fireEvent.press(botao("Salvar avaliação"));
  await screen.findByText("Avaliação salva.");
  await tocar("Voltar ao relatório");

  // Personal ainda não avaliou: assinatura bloqueada pelo domínio.
  expect(await screen.findByText("• O personal ainda não avaliou o ciclo.")).toBeTruthy();
  expect(botao("Assinar relatório")).toBeDisabled();
  await sair();

  // ── PERSONAL (sem conta, via token) ───────────────────────────────────
  await fireEvent.press(await screen.findByText("Sou personal, tenho um código"));
  await fireEvent.changeText(screen.getByLabelText("Código de acesso"), "CARLA-2026");
  await fireEvent.press(botao("Acessar"));
  await tocar("Abrir Ciclo de setembro — Hipertrofia");

  await tocar("Avaliar desempenho");
  for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByLabelText("Aumentar Execução técnica"));
  await fireEvent.changeText(screen.getByLabelText("Comentário (opcional)"), "Bateu o mínimo com boa técnica.");
  await fireEvent.press(botao("Salvar avaliação"));
  await screen.findByText("Avaliação salva.");
  await tocar("Voltar ao relatório");

  await tocar("Assinar relatório");
  await assinar();
  expect(await screen.findByText("Assinado! Falta a outra assinatura.")).toBeTruthy();
  await tocar("Voltar ao relatório");
  await sair();

  // ── ALUNO assina depois ───────────────────────────────────────────────
  await entrar("aluno@pxgym.dev");
  await tocar("Abrir Ciclo de setembro — Hipertrofia");
  await tocar("Assinar relatório");
  await assinar();
  expect(await screen.findByText("Assinado! O relatório foi para a coordenação.")).toBeTruthy();
  await tocar("Voltar ao relatório");
  expect(await screen.findByText("Aguardando aprovação")).toBeTruthy();
  await sair();

  // ── COORDENAÇÃO ───────────────────────────────────────────────────────
  await entrar("coordenacao@pxgym.dev");
  await tocar("Abrir Ciclo de setembro — Hipertrofia");
  await tocar("Aprovar relatório");
  expect(await screen.findByText("Relatório aprovado.")).toBeTruthy();

  // Invariante: aprovado, mas assinaturas ainda só no aparelho → sem PDF.
  expect(await screen.findByText("PDF ainda bloqueado")).toBeTruthy();
  expect(botao("Gerar PDF")).toBeDisabled();

  await tocar("Sincronizar agora");
  expect(await screen.findByText(/itens enviados — tudo sincronizado/)).toBeTruthy();
  await tocar("Gerar PDF");
  expect(await screen.findByText("PDF gerado: memoria://relatorios/ciclo-3.pdf")).toBeTruthy();

  await sair();
  expect(await screen.findByLabelText("E-mail")).toBeTruthy();
});
