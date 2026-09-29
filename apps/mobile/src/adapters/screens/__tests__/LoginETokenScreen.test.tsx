import { Text } from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";
import { LoginScreen } from "../LoginScreen";
import { AcessoTokenScreen } from "../AcessoTokenScreen";
import { useAuth } from "../../hooks/useAuth";
import { montar } from "../../__tests__/utils/montar";
import { SENHA_DEMO } from "../../memoria/gateways-simulados";

/** Mostra quem está logado — prova que o login chegou ao Context. */
function QuemEsta() {
  const { sessao } = useAuth();
  return <Text>{sessao ? `logado: ${sessao.usuario.papel}` : "deslogado"}</Text>;
}

const contas = [
  { rotulo: "Aluno", email: "aluno@pxgym.dev", senha: SENHA_DEMO },
  { rotulo: "Coordenação", email: "coordenacao@pxgym.dev", senha: SENHA_DEMO },
];

describe("LoginScreen", () => {
  it("digitar e-mail e senha e tocar em Entrar autentica pelo use case", async () => {
    const { renderizar, sessoes } = montar();
    await renderizar(
      <>
        <LoginScreen onCriarConta={jest.fn()} onAcessoPersonal={jest.fn()} />
        <QuemEsta />
      </>,
    );

    await fireEvent.changeText(screen.getByLabelText("E-mail"), "aluno@pxgym.dev");
    await fireEvent.changeText(screen.getByLabelText("Senha"), SENHA_DEMO);
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("logado: aluno")).toBeTruthy();
    expect(sessoes.sessao?.usuario.email).toBe("aluno@pxgym.dev");
  });

  it("senha errada mostra a mensagem e continua deslogado", async () => {
    const { renderizar } = montar();
    await renderizar(
      <>
        <LoginScreen onCriarConta={jest.fn()} onAcessoPersonal={jest.fn()} />
        <QuemEsta />
      </>,
    );
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "aluno@pxgym.dev");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "errada");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha inválidos.")).toBeTruthy();
    expect(screen.getByText("deslogado")).toBeTruthy();
  });

  it("atalhos de demonstração preenchem a conta escolhida", async () => {
    const { renderizar } = montar();
    await renderizar(
      <>
        <LoginScreen onCriarConta={jest.fn()} onAcessoPersonal={jest.fn()} contasDemo={contas} />
        <QuemEsta />
      </>,
    );
    await fireEvent.press(screen.getByLabelText("Preencher conta Coordenação"));
    expect(screen.getByLabelText("E-mail").props.value).toBe("coordenacao@pxgym.dev");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("logado: coordenacao")).toBeTruthy();
  });

  it("sem contas de demo, não mostra os atalhos; links navegam", async () => {
    const criar = jest.fn();
    const token = jest.fn();
    const { renderizar } = montar();
    await renderizar(<LoginScreen onCriarConta={criar} onAcessoPersonal={token} />);
    expect(screen.queryByText(/Modo demonstração/)).toBeNull();
    await fireEvent.press(screen.getByText("Criar conta"));
    await fireEvent.press(screen.getByText("Sou personal, tenho um código"));
    expect(criar).toHaveBeenCalled();
    expect(token).toHaveBeenCalled();
  });
});

describe("AcessoTokenScreen", () => {
  it("código válido entra como personal", async () => {
    const { renderizar } = montar();
    await renderizar(
      <>
        <AcessoTokenScreen onVoltar={jest.fn()} />
        <QuemEsta />
      </>,
    );
    expect(screen.getByRole("button", { name: "Acessar" })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Código de acesso"), "carla-2026");
    await fireEvent.press(screen.getByRole("button", { name: "Acessar" }));
    expect(await screen.findByText("logado: personal")).toBeTruthy();
  });

  it("código inválido mostra o motivo", async () => {
    const voltar = jest.fn();
    const { renderizar } = montar();
    await renderizar(<AcessoTokenScreen onVoltar={voltar} />);
    await fireEvent.changeText(screen.getByLabelText("Código de acesso"), "XPTO-0000");
    await fireEvent.press(screen.getByRole("button", { name: "Acessar" }));
    expect(await screen.findByText("Código não encontrado. Confira com o aluno.")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Voltar"));
    expect(voltar).toHaveBeenCalled();
  });
});
