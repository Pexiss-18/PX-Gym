import { Pressable, Text, View } from "react-native";
import { act, fireEvent, renderHook, screen, waitFor } from "@testing-library/react-native";
import { FakeAuthGateway } from "@px/core/testing/fakes";
import { AuthProvider } from "../AuthContext";
import { useAuth, useUsuario } from "../../hooks/useAuth";
import { ALUNO, montar, sessaoDe } from "../../__tests__/utils/montar";
import { SENHA_DEMO } from "../../memoria/gateways-simulados";

/** Componente "neto" qualquer: lê a sessão sem receber prop nenhuma. */
function Saudacao() {
  const { sessao, carregando, sair } = useAuth();
  if (carregando) return <Text>carregando…</Text>;
  return (
    <View>
      <Text>{sessao ? `Olá, ${sessao.usuario.nome} (${sessao.usuario.papel})` : "Ninguém logado"}</Text>
      <Pressable onPress={() => void sair()}>
        <Text>Sair</Text>
      </Pressable>
    </View>
  );
}

describe("AuthProvider + useAuth (Context API)", () => {
  it("carrega a sessão salva no aparelho ao abrir o app", async () => {
    const { renderizar } = montar({ logado: ALUNO, exigirSessao: false });
    await renderizar(<Saudacao />);
    expect(await screen.findByText("Olá, Paulo Rogério (aluno)")).toBeTruthy();
  });

  it("sem sessão salva: termina de carregar sem usuário", async () => {
    const { renderizar } = montar();
    await renderizar(<Saudacao />);
    expect(await screen.findByText("Ninguém logado")).toBeTruthy();
  });

  it("falha ao ler o SecureStore não trava o app no carregando", async () => {
    const { renderizar } = montar({
      servicosAuth: { restaurar: { execute: jest.fn().mockRejectedValue(new Error("keystore")) } },
    });
    await renderizar(<Saudacao />);
    expect(await screen.findByText("Ninguém logado")).toBeTruthy();
  });

  it("entrar chama o use case de login e publica a sessão pra árvore toda", async () => {
    const { Providers, sessoes } = montar();
    const { result } = await renderHook(() => useAuth(), { wrapper: Providers });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    let resposta: { erro: string | null } = { erro: "?" };
    await act(async () => {
      resposta = await result.current.entrar("personal@pxgym.dev", SENHA_DEMO);
    });

    expect(resposta.erro).toBeNull();
    expect(result.current.sessao?.usuario.papel).toBe("personal");
    expect(sessoes.sessao?.usuario.papel).toBe("personal"); // guardada no "SecureStore"
  });

  it("recusa vira mensagem pronta pra tela, sem sessão", async () => {
    const { Providers } = montar();
    const { result } = await renderHook(() => useAuth(), { wrapper: Providers });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    let r1: { erro: string | null } = { erro: null };
    let r2: { erro: string | null } = { erro: null };
    await act(async () => {
      r1 = await result.current.entrar("aluno@pxgym.dev", "errada");
      r2 = await result.current.entrar("sem-arroba", "x");
    });
    expect(r1.erro).toBe("E-mail ou senha inválidos.");
    expect(r2.erro).toBe("Confira o e-mail — o formato não parece válido.");
    expect(result.current.sessao).toBeNull();
  });

  it("acesso do personal por token", async () => {
    const { Providers } = montar();
    const { result } = await renderHook(() => useAuth(), { wrapper: Providers });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    let ruim: { erro: string | null } = { erro: null };
    await act(async () => {
      ruim = await result.current.entrarComToken("NAO-EXISTE");
    });
    expect(ruim.erro).toBe("Código não encontrado. Confira com o aluno.");

    await act(async () => {
      await result.current.entrarComToken("carla-2026");
    });
    expect(result.current.sessao?.usuario).toMatchObject({ nome: "Carla Mendes", papel: "personal" });
    expect(result.current.sessao?.expiraEm).toBeInstanceOf(Date);
  });

  it("cadastrar devolve se o e-mail de confirmação foi enviado", async () => {
    const { Providers } = montar();
    const { result } = await renderHook(() => useAuth(), { wrapper: Providers });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    let novo = { erro: null as string | null, confirmacaoEnviada: false };
    let repetido = { erro: null as string | null, confirmacaoEnviada: false };
    await act(async () => {
      novo = await result.current.cadastrar("novo@pxgym.dev", "123456", "123456");
      repetido = await result.current.cadastrar("aluno@pxgym.dev", "123456", "123456");
    });
    expect(novo).toEqual({ erro: null, confirmacaoEnviada: true });
    expect(repetido.erro).toBe("Já existe uma conta com esse e-mail.");
  });

  it("sair limpa a sessão da árvore e do aparelho — mesmo se o provedor falhar", async () => {
    const auth = new FakeAuthGateway();
    auth.signOut = async () => {
      throw new Error("sem rede");
    };
    const { renderizar, sessoes } = montar({ logado: ALUNO, auth, exigirSessao: false });
    await renderizar(<Saudacao />);
    await screen.findByText(/Olá, Paulo/);

    await fireEvent.press(screen.getByText("Sair"));
    expect(await screen.findByText("Ninguém logado")).toBeTruthy();
    expect(sessoes.sessao).toBeNull();
  });

  it("fora do provider (ou da área logada) é erro de programação", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(renderHook(() => useAuth())).rejects.toThrow(/AuthProvider/);

    const semSessao = {
      autenticar: { execute: jest.fn() },
      restaurar: { execute: jest.fn().mockResolvedValue(null) },
      encerrar: { execute: jest.fn() },
      acessarViaToken: { execute: jest.fn() },
      cadastrar: { execute: jest.fn() },
    };
    await expect(
      renderHook(() => useUsuario(), {
        wrapper: ({ children }) => <AuthProvider servicos={semSessao}>{children}</AuthProvider>,
      }),
    ).rejects.toThrow(/fora da área logada/);
  });

  it("useUsuario devolve o usuário da sessão", async () => {
    const { Providers } = montar({ logado: ALUNO });
    const { result } = await renderHook(() => useUsuario(), { wrapper: Providers });
    await waitFor(() => expect(result.current).toEqual(sessaoDe(ALUNO).usuario));
  });
});
