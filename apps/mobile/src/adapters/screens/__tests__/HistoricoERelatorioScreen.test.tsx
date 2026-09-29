import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { HistoricoRelatoriosScreen } from "../HistoricoRelatoriosScreen";
import { RelatorioScreen } from "../RelatorioScreen";
import { ALUNO, COORDENACAO, PERSONAL, montar } from "../../__tests__/utils/montar";

const acoes = () => ({
  onVoltar: jest.fn(),
  onRegistrarTreino: jest.fn(),
  onAvaliar: jest.fn(),
  onAssinar: jest.fn(),
});

describe("HistoricoRelatoriosScreen", () => {
  it("aluno vê seus três ciclos, do mais recente pro mais antigo", async () => {
    const abrir = jest.fn();
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<HistoricoRelatoriosScreen onAbrir={abrir} />);

    expect(await screen.findByText("Paulo Rogério · Aluno")).toBeTruthy();
    const titulos = screen.getAllByRole("button", { name: /^Abrir / }).map((b) => b.props.accessibilityLabel);
    expect(titulos).toEqual([
      "Abrir Ciclo de setembro — Hipertrofia",
      "Abrir Ciclo de agosto — Força",
      "Abrir Ciclo de julho — Adaptação",
    ]);
    expect(screen.getByText("Em andamento")).toBeTruthy();
    expect(screen.getByText("Aguardando aprovação")).toBeTruthy();
    expect(screen.getByText("Aprovado")).toBeTruthy();
    expect(screen.getByText("Tudo sincronizado")).toBeTruthy(); // o aprovado

    await fireEvent.press(screen.getByLabelText("Abrir Ciclo de agosto — Força"));
    expect(abrir).toHaveBeenCalledWith("ciclo-2");
  });

  it("coordenação vê tudo; sair encerra a sessão", async () => {
    const { renderizar, sessoes } = montar({ logado: COORDENACAO });
    await renderizar(<HistoricoRelatoriosScreen onAbrir={jest.fn()} />);
    expect(await screen.findByText("Coordenação Px GYM · Coordenação")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Sair" }));
    expect(sessoes.sessao).toBeNull();
  });

  it("personal de outro aluno não vê nada", async () => {
    const { renderizar } = montar({ logado: { ...PERSONAL, id: "u-outro" } });
    await renderizar(<HistoricoRelatoriosScreen onAbrir={jest.fn()} />);
    expect(await screen.findByText("Nenhum relatório por aqui ainda.")).toBeTruthy();
  });

  it("falha ao carregar mostra erro", async () => {
    const { renderizar } = montar({
      logado: ALUNO,
      casos: { listarRelatorios: { execute: jest.fn().mockRejectedValue(new Error("x")) } },
    });
    await renderizar(<HistoricoRelatoriosScreen onAbrir={jest.fn()} />);
    expect(await screen.findByText("Não foi possível carregar os relatórios.")).toBeTruthy();
  });
});

describe("RelatorioScreen — ações por papel e status", () => {
  it("aluno, ciclo em andamento: registra treino e autoavalia; assinatura bloqueada com pendências", async () => {
    const a = acoes();
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<RelatorioScreen cicloId="ciclo-3" {...a} />);

    expect(await screen.findByText("6h / 12h")).toBeTruthy();
    expect(screen.getByText("Faltam 6h pro mínimo.")).toBeTruthy();
    expect(screen.getByText("Treinos (3)")).toBeTruthy();
    expect(screen.getByText("O personal ainda não avaliou.")).toBeTruthy();
    expect(screen.getByText("• Faltam 6h de treino pro mínimo do ciclo.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Assinar relatório" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Aprovar relatório" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Registrar treino" }));
    await fireEvent.press(screen.getByRole("button", { name: "Fazer autoavaliação" }));
    expect(a.onRegistrarTreino).toHaveBeenCalled();
    expect(a.onAvaliar).toHaveBeenCalled();
  });

  it("personal vê 'Avaliar desempenho' e não registra treino", async () => {
    const { renderizar } = montar({ logado: PERSONAL });
    await renderizar(<RelatorioScreen cicloId="ciclo-3" {...acoes()} />);
    expect(await screen.findByRole("button", { name: "Avaliar desempenho" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Registrar treino" })).toBeNull();
  });

  it("aguardando aprovação: avaliações, faixas, média e as duas assinaturas", async () => {
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<RelatorioScreen cicloId="ciclo-2" {...acoes()} />);
    expect(await screen.findByText("Aguardando aprovação")).toBeTruthy();
    expect(screen.getAllByText("Média")).toHaveLength(2);
    expect(screen.getByText("8,5")).toBeTruthy(); // média do personal (9+8+9,5+7,5)/4
    expect(screen.getByLabelText("Assinatura do aluno")).toBeTruthy();
    expect(screen.getByLabelText("Assinatura do personal")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Registrar treino" })).toBeNull(); // assinado = bloqueado
  });

  it("coordenação devolve com motivo: o aluno vê o motivo e o ciclo reabre", async () => {
    const { renderizar } = montar({ logado: COORDENACAO });
    await renderizar(<RelatorioScreen cicloId="ciclo-2" {...acoes()} />);

    await fireEvent.press(await screen.findByRole("button", { name: "Devolver para correção" }));
    await fireEvent.changeText(screen.getByLabelText("Motivo da devolução"), "curto");
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar devolução" }));
    expect(await screen.findByText(/mínimo 10 caracteres/)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Motivo da devolução"), "Faltou o treino de pernas da semana 3.");
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar devolução" }));
    expect(await screen.findByText("Relatório devolvido ao aluno.")).toBeTruthy();
    expect(screen.getByText("Devolvido: Faltou o treino de pernas da semana 3.")).toBeTruthy();
    expect(within(screen.getByText("Assinaturas").parent!.parent!).getAllByText("pendente")).toHaveLength(2);
  });

  it("coordenação aprova; PDF fica bloqueado até sincronizar; depois gera", async () => {
    const { renderizar } = montar({ logado: COORDENACAO });
    await renderizar(<RelatorioScreen cicloId="ciclo-2" {...acoes()} />);

    await fireEvent.press(await screen.findByRole("button", { name: "Aprovar relatório" }));
    expect(await screen.findByText("Relatório aprovado.")).toBeTruthy();
    expect(await screen.findByText("PDF ainda bloqueado")).toBeTruthy();
    expect(screen.getByText("• A assinatura do aluno ainda não chegou na nuvem.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gerar PDF" })).toBeDisabled();

    await fireEvent.press(screen.getByRole("button", { name: "Sincronizar agora" }));
    expect(await screen.findByText(/tudo sincronizado/)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("PDF ainda bloqueado")).toBeNull());

    await fireEvent.press(screen.getByRole("button", { name: "Gerar PDF" }));
    expect(await screen.findByText("PDF gerado: memoria://relatorios/ciclo-2.pdf")).toBeTruthy();
  });

  it("relatório aprovado e sincronizado: só o PDF", async () => {
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<RelatorioScreen cicloId="ciclo-1" {...acoes()} />);
    expect(await screen.findByRole("button", { name: "Gerar PDF" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Sincronizar agora" })).toBeNull();
    expect(screen.getByText("Tudo sincronizado")).toBeTruthy();
  });

  it("sem acesso: mensagem do use case; voltar funciona", async () => {
    const a = acoes();
    const { renderizar } = montar({ logado: { ...ALUNO, id: "u-intruso" } });
    await renderizar(<RelatorioScreen cicloId="ciclo-1" {...a} />);
    expect(await screen.findByText("Você não participa deste ciclo.")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Voltar"));
    expect(a.onVoltar).toHaveBeenCalled();
  });
});
