import { fireEvent, screen } from "@testing-library/react-native";
import { AssinaturaScreen } from "../AssinaturaScreen";
import { AvaliacaoScreen } from "../AvaliacaoScreen";
import { ALUNO, PERSONAL, montar } from "../../__tests__/utils/montar";

/** Desenha um traço no quadro usando os eventos de responder do RN. */
async function rabiscar() {
  const quadro = screen.getByTestId("quadro-assinatura");
  await fireEvent(quadro, "layout", { nativeEvent: { layout: { width: 320, height: 180 } } });
  await fireEvent(quadro, "responderGrant", { nativeEvent: { locationX: 20, locationY: 120 } });
  for (const [x, y] of [[60, 60], [100, 130], [150, 70], [220, 110], [290, 80]]) {
    await fireEvent(quadro, "responderMove", { nativeEvent: { locationX: x, locationY: y } });
  }
}

describe("AssinaturaScreen", () => {
  it("aluno assina o ciclo completo: falta só a assinatura do personal", async () => {
    // ciclo-2 da demo já está assinado; o cenário aqui é o ciclo-3 completado
    const { renderizar, casos } = montar({ logado: ALUNO });
    // aluno completa o ciclo-3: horas + autoavaliação
    await casos.registrarAtividades.execute({
      usuario: ALUNO,
      cicloId: "ciclo-3",
      atividades: [{ data: "2026-09-20", descricao: "Treino longo", horas: 4, local: null },
        { data: "2026-09-21", descricao: "Treino longo 2", horas: 2, local: null }],
    });
    await casos.realizarAutoAvaliacao.execute({ usuario: ALUNO, cicloId: "ciclo-3", criterios: [{ nome: "Disciplina", nota: 8 }], comentario: "" });
    await casos.avaliarDesempenho.execute({ usuario: PERSONAL, cicloId: "ciclo-3", criterios: [{ nome: "Frequência", nota: 9 }], comentario: "" });

    await renderizar(<AssinaturaScreen cicloId="ciclo-3" onVoltar={jest.fn()} />);
    expect(await screen.findByText("Declaro que os treinos e a autoavaliação deste ciclo são verdadeiros.")).toBeTruthy();
    expect(screen.getByText("12h")).toBeTruthy();
    expect(screen.getByText("Assine aqui com o dedo")).toBeTruthy();

    await rabiscar();
    expect(screen.queryByText("Assine aqui com o dedo")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar assinatura" }));
    expect(await screen.findByText("Assinado! Falta a outra assinatura.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Voltar ao relatório" })).toBeTruthy();
  });

  it("quadro em branco: o Value Object Assinatura recusa", async () => {
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<AssinaturaScreen cicloId="ciclo-3" onVoltar={jest.fn()} />);
    await screen.findByText(/Declaro/);
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar assinatura" }));
    expect(await screen.findByText("Assinatura vazia ou curta demais.")).toBeTruthy();
  });

  it("com pendências (horas, avaliações) o domínio impede a assinatura", async () => {
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<AssinaturaScreen cicloId="ciclo-3" onVoltar={jest.fn()} />);
    await screen.findByText(/Declaro/);
    await rabiscar();
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar assinatura" }));
    expect(await screen.findByText(/Faltam 6h de treino/)).toBeTruthy();
  });

  it("limpar apaga o desenho", async () => {
    const { renderizar } = montar({ logado: PERSONAL });
    await renderizar(<AssinaturaScreen cicloId="ciclo-3" onVoltar={jest.fn()} />);
    expect(await screen.findByText(/Declaro que acompanhei/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Limpar" })).toBeDisabled();
    await rabiscar();
    await fireEvent.press(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.getByText("Assine aqui com o dedo")).toBeTruthy();
  });

  it("ciclo inexistente", async () => {
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<AssinaturaScreen cicloId="nada" onVoltar={jest.fn()} />);
    expect(await screen.findByText("Ciclo não encontrado.")).toBeTruthy();
  });
});

describe("AvaliacaoScreen", () => {
  it("personal ajusta notas (faixa acompanha) e salva", async () => {
    const { renderizar, casos } = montar({ logado: PERSONAL });
    await renderizar(<AvaliacaoScreen cicloId="ciclo-3" onVoltar={jest.fn()} />);

    expect(screen.getByText("Avaliar desempenho")).toBeTruthy();
    expect(screen.getByLabelText("Nota de Execução técnica")).toHaveTextContent("7");
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByLabelText("Aumentar Execução técnica"));
    expect(screen.getByLabelText("Nota de Execução técnica")).toHaveTextContent("9");
    expect(screen.getAllByText("MB · Muito bom")).toHaveLength(1);
    await fireEvent.press(screen.getByLabelText("Diminuir Frequência"));
    expect(screen.getByLabelText("Nota de Frequência")).toHaveTextContent("6,5");

    await fireEvent.changeText(screen.getByLabelText("Comentário (opcional)"), "Ótima evolução");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar avaliação" }));
    expect(await screen.findByText("Avaliação salva.")).toBeTruthy();

    const r = await casos.consultarRelatorio.execute({ usuario: PERSONAL, cicloId: "ciclo-3" });
    expect(r.ok && r.valor.avaliacaoPersonal?.criterios[0]).toEqual({ nome: "Execução técnica", nota: 9, faixa: "MB" });
    expect(r.ok && r.valor.avaliacaoPersonal?.comentario).toBe("Ótima evolução");
  });

  it("aluno vê os critérios da autoavaliação; nota trava em 0 e 10", async () => {
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<AvaliacaoScreen cicloId="ciclo-3" onVoltar={jest.fn()} />);
    expect(screen.getByText("Autoavaliação")).toBeTruthy();
    expect(screen.getByText("Sono e recuperação")).toBeTruthy();
    for (let i = 0; i < 10; i++) await fireEvent.press(screen.getByLabelText("Aumentar Disciplina"));
    expect(screen.getByLabelText("Nota de Disciplina")).toHaveTextContent("10");
    for (let i = 0; i < 25; i++) await fireEvent.press(screen.getByLabelText("Diminuir Alimentação"));
    expect(screen.getByLabelText("Nota de Alimentação")).toHaveTextContent("0");
    expect(screen.getByText("F · Fraco")).toBeTruthy();
  });

  it("ciclo já assinado: a invariante recusa e a tela mostra", async () => {
    const { renderizar } = montar({ logado: PERSONAL });
    await renderizar(<AvaliacaoScreen cicloId="ciclo-2" onVoltar={jest.fn()} />);
    await fireEvent.press(screen.getByRole("button", { name: "Salvar avaliação" }));
    expect(await screen.findByText(/Relatório já assinado/)).toBeTruthy();
  });
});
