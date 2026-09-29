import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { geoPoint } from "@px/core";
import { FakeLocation } from "@px/core/testing/fakes";
import { AtividadesFormScreen } from "../AtividadesFormScreen";
import { RelatorioScreen } from "../RelatorioScreen";
import { ALUNO, PERSONAL, montar } from "../../__tests__/utils/montar";

const gpsOk = () => new FakeLocation("granted", geoPoint(-19.9245, -43.9352, Date.UTC(2026, 8, 29, 13)));

async function preencher(descricao: string, horas: string, data?: string) {
  if (data) await fireEvent.changeText(screen.getByLabelText("Data (AAAA-MM-DD)"), data);
  await fireEvent.changeText(screen.getByLabelText("O que você treinou"), descricao);
  await fireEvent.changeText(screen.getByLabelText("Duração em horas"), horas);
  await fireEvent.press(screen.getByRole("button", { name: "Adicionar à lista" }));
}

describe("AtividadesFormScreen", () => {
  it("monta um lote com GPS, salva e mostra 'salvo'", async () => {
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(
      <AtividadesFormScreen cicloId="ciclo-3" localizacao={gpsOk()} onVoltar={jest.fn()} hoje="2026-09-20" />,
    );

    expect(await screen.findByText("Nenhum treino na lista ainda.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Salvar treinos" })).toBeDisabled();

    await fireEvent.press(screen.getByLabelText("Marcar check-in por GPS"));
    expect(await screen.findByText("Check-in: -19.9245, -43.9352")).toBeTruthy();
    await preencher("Treino C — pernas", "1,5");
    await preencher("Cardio na esteira", "0.5", "2026-09-21");

    expect(screen.getByText("Para salvar (2)")).toBeTruthy();
    expect(screen.getByText("20/09/2026 · com check-in")).toBeTruthy();
    expect(screen.getByText("1,5h")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Salvar 2 treinos" }));
    expect(await screen.findByText("Treinos salvos no relatório.")).toBeTruthy();
    expect(screen.getByText("Para salvar (0)")).toBeTruthy();
  });

  it("o treino salvo aparece no relatório (mesmo Context, outra tela)", async () => {
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(
      <>
        <AtividadesFormScreen cicloId="ciclo-3" localizacao={gpsOk()} onVoltar={jest.fn()} hoje="2026-09-20" />
        <RelatorioScreen
          cicloId="ciclo-3"
          onVoltar={jest.fn()}
          onRegistrarTreino={jest.fn()}
          onAvaliar={jest.fn()}
          onAssinar={jest.fn()}
        />
      </>,
    );
    expect(await screen.findByText("6h / 12h")).toBeTruthy();
    await preencher("Treino D — posterior", "3");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar 1 treino" }));
    expect(await screen.findByText("9h / 12h")).toBeTruthy();
    expect(screen.getByText("Treino D — posterior")).toBeTruthy();
  });

  it("formulário incompleto é barrado antes do use case", async () => {
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<AtividadesFormScreen cicloId="ciclo-3" localizacao={gpsOk()} onVoltar={jest.fn()} />);
    await preencher("", "abc");
    expect(await screen.findByText("Preencha descrição e horas (ex.: 1,5).")).toBeTruthy();
  });

  it("regra do domínio (data fora do ciclo) volta como erro na tela", async () => {
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<AtividadesFormScreen cicloId="ciclo-3" localizacao={gpsOk()} onVoltar={jest.fn()} />);
    await preencher("Treino de outubro", "1", "2026-10-10");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar 1 treino" }));
    expect(await screen.findByText(/fora do ciclo/)).toBeTruthy();
  });

  it("dá pra tirar um treino da lista antes de salvar", async () => {
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<AtividadesFormScreen cicloId="ciclo-3" localizacao={gpsOk()} onVoltar={jest.fn()} />);
    await preencher("Treino A", "1");
    await fireEvent.press(screen.getByLabelText("Remover Treino A"));
    expect(screen.getByText("Para salvar (0)")).toBeTruthy();
  });

  it("GPS: pede permissão; negada ou sem sinal, avisa e segue sem check-in", async () => {
    const negado = new FakeLocation("undetermined", null, "denied");
    const { renderizar } = montar({ logado: ALUNO });
    await renderizar(<AtividadesFormScreen cicloId="ciclo-3" localizacao={negado} onVoltar={jest.fn()} />);
    await fireEvent.press(screen.getByLabelText("Marcar check-in por GPS"));
    expect(await screen.findByText(/Sem permissão de localização/)).toBeTruthy();
    expect(negado.requests).toBe(1);

    negado.current = "granted"; // permitiu, mas o GPS não tem fix
    await fireEvent.press(screen.getByLabelText("Marcar check-in por GPS"));
    expect(await screen.findByText("Não deu pra pegar sua posição agora.")).toBeTruthy();
  });

  it("personal abrindo o formulário recebe a recusa do use case", async () => {
    const { renderizar } = montar({ logado: PERSONAL });
    await renderizar(<AtividadesFormScreen cicloId="ciclo-3" localizacao={gpsOk()} onVoltar={jest.fn()} hoje="2026-09-20" />);
    await preencher("Treino", "1");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar 1 treino" }));
    await waitFor(() => expect(screen.getByText("Só o aluno do ciclo registra treinos.")).toBeTruthy());
  });
});
