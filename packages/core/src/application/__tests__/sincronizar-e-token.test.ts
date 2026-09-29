import { SincronizarFilaUseCase } from "../use-cases/sincronizar-fila";
import { AcessarViaTokenUseCase } from "../use-cases/acessar-via-token";
import { falhaDoErro } from "../use-cases/resultado";
import {
  AcompanhamentoRepositoryFake,
  CicloAvaliacaoRepositoryFake,
  SessionStorageFake,
  SincronizacaoGatewayFake,
  TokenPersonalRepositoryFake,
} from "../../testing/fakes-ciclo";
import { FakeConnectivity, FixedClock } from "../../testing/fakes";
import {
  AGORA,
  acompanhamentoPadrao,
  cicloAguardandoAprovacao,
  cicloAprovado,
  cicloNovo,
  tokenPadrao,
} from "../../testing/cenario-ciclo";

describe("SincronizarFilaUseCase", () => {
  it("offline: não envia nada e só resume a fila", async () => {
    const gateway = new SincronizacaoGatewayFake();
    const r = await new SincronizarFilaUseCase(
      new CicloAvaliacaoRepositoryFake([cicloAguardandoAprovacao()]),
      gateway,
      new FakeConnectivity(false),
    ).execute();

    expect(r).toEqual({ status: "offline", resumo: { pendentes: 8, comErro: 0, sincronizados: 0 } });
    expect(gateway.enviados).toHaveLength(0);
  });

  it("online: envia tudo, grava synced e libera o PDF do ciclo aprovado", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloAprovado({ assinaturasSincronizadas: false })]);
    const gateway = new SincronizacaoGatewayFake();
    const r = await new SincronizarFilaUseCase(repo, gateway, new FakeConnectivity(true)).execute();

    expect(r).toEqual({
      status: "concluido",
      enviados: 8,
      falhas: 0,
      resumo: { pendentes: 0, comErro: 0, sincronizados: 8 },
    });
    expect(gateway.enviados[0]!.tipo).toBe("assinatura");
    expect((await repo.porId("ciclo-set"))!.podeGerarPdf()).toBe(true);
  });

  it("uma falha não para a fila; o item volta como error na próxima", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloAguardandoAprovacao()]);
    const gateway = new SincronizacaoGatewayFake();
    gateway.falhar.add("assinatura:personal");
    const uc = new SincronizarFilaUseCase(repo, gateway, new FakeConnectivity(true));

    const primeira = await uc.execute();
    expect(primeira).toMatchObject({ enviados: 7, falhas: 1, resumo: { comErro: 1, sincronizados: 7 } });

    gateway.falhar.clear();
    const segunda = await uc.execute();
    expect(segunda).toMatchObject({ enviados: 1, falhas: 0, resumo: { comErro: 0, sincronizados: 8 } });
  });

  it("fila vazia: nada a enviar, nada salvo", async () => {
    const repo = new CicloAvaliacaoRepositoryFake([cicloNovo()]);
    const r = await new SincronizarFilaUseCase(repo, new SincronizacaoGatewayFake(), new FakeConnectivity(true)).execute();
    expect(r).toMatchObject({ enviados: 0, falhas: 0 });
    expect(repo.salvamentos).toBe(0);
  });
});

describe("AcessarViaTokenUseCase", () => {
  const setup = (opts: { token?: ReturnType<typeof tokenPadrao>; agora?: Date; semAcompanhamento?: boolean } = {}) => {
    const sessoes = new SessionStorageFake();
    const uc = new AcessarViaTokenUseCase(
      new TokenPersonalRepositoryFake([opts.token ?? tokenPadrao()]),
      new AcompanhamentoRepositoryFake(opts.semAcompanhamento ? [] : [acompanhamentoPadrao()]),
      sessoes,
      new FixedClock(opts.agora ?? AGORA),
    );
    return { sessoes, uc };
  };

  it("token válido cria sessão de personal que expira junto com o token", async () => {
    const { sessoes, uc } = setup();
    const r = await uc.execute({ token: " carla-2026 " });

    expect(r).toEqual({
      status: "autorizado",
      sessao: {
        usuario: { id: "u-personal", nome: "Carla Mendes", email: "", papel: "personal" },
        token: "token:CARLA-2026",
        expiraEm: new Date(AGORA.getTime() + 72 * 3600e3),
      },
    });
    expect(sessoes.sessao?.usuario.papel).toBe("personal");
  });

  it("código que não existe (ou vazio)", async () => {
    const { uc, sessoes } = setup();
    expect(await uc.execute({ token: "NAO-EXISTE" })).toEqual({ status: "recusado", motivo: "token-invalido" });
    expect(await uc.execute({ token: "   " })).toEqual({ status: "recusado", motivo: "token-invalido" });
    expect(sessoes.sessao).toBeNull();
  });

  it("token expirado", async () => {
    const { uc } = setup({ agora: new Date(AGORA.getTime() + 100 * 3600e3) });
    expect(await uc.execute({ token: "CARLA-2026" })).toEqual({ status: "recusado", motivo: "token-expirado" });
  });

  it("token revogado", async () => {
    const token = tokenPadrao();
    token.revogar(AGORA);
    const { uc } = setup({ token });
    expect(await uc.execute({ token: "CARLA-2026" })).toEqual({ status: "recusado", motivo: "token-revogado" });
  });

  it("acompanhamento encerrado ou inexistente", async () => {
    const { uc } = setup({ semAcompanhamento: true });
    expect(await uc.execute({ token: "CARLA-2026" })).toEqual({
      status: "recusado",
      motivo: "acompanhamento-encerrado",
    });
  });
});

describe("falhaDoErro", () => {
  it("erro desconhecido vira falha-externa", () => {
    expect(falhaDoErro(new Error("disco cheio"))).toEqual({
      ok: false,
      erro: { tipo: "falha-externa", mensagem: "disco cheio" },
    });
    expect(falhaDoErro("texto")).toMatchObject({ erro: { mensagem: "texto" } });
  });
});
