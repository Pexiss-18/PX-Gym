import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { CicloLeitura, Resultado } from "@px/core";
import { useAtividades } from "../useAtividades";
import { useAcoesRelatorio, useHistoricoRelatorios, useRelatorio } from "../useRelatorios";
import { ALUNO, COORDENACAO, PERSONAL, montar } from "../../__tests__/utils/montar";

const treino = { data: "2026-09-20", descricao: "Treino C — pernas", horas: 2, local: null };

describe("useAtividades (ponte formulário ↔ RegistrarAtividadesUseCase)", () => {
  it("idle → salvando → salvo, e a leitura do ciclo reflete o treino", async () => {
    // Use case fake controlado na mão pra enxergar o estado intermediário.
    let concluir!: (r: Resultado<CicloLeitura>) => void;
    const execute = jest.fn(() => new Promise<Resultado<CicloLeitura>>((ok) => (concluir = ok)));
    const { Providers } = montar({ logado: ALUNO, casos: { registrarAtividades: { execute } } });

    const { result } = await renderHook(() => useAtividades("ciclo-3"), { wrapper: Providers });
    await waitFor(() => expect(result.current.estado).toBe("idle"));

    let promessa!: Promise<boolean>;
    await act(async () => {
      promessa = result.current.registrar([treino]);
    });
    expect(result.current.estado).toBe("salvando");
    expect(execute).toHaveBeenCalledWith({ usuario: ALUNO, cicloId: "ciclo-3", atividades: [treino] });

    await act(async () => {
      concluir({ ok: true, valor: {} as CicloLeitura });
      await promessa;
    });
    expect(result.current.estado).toBe("salvo");
  });

  it("erro do domínio vira estado 'erro' com a mensagem; resetar volta pro idle", async () => {
    const { Providers } = montar({ logado: ALUNO });
    const { result } = await renderHook(() => useAtividades("ciclo-3"), { wrapper: Providers });
    await waitFor(() => expect(result.current.estado).toBe("idle"));

    let ok = true;
    await act(async () => {
      ok = await result.current.registrar([{ ...treino, data: "2026-10-15" }]);
    });
    expect(ok).toBe(false);
    expect(result.current.estado).toBe("erro");
    expect(result.current.erro).toMatch(/fora do ciclo/);

    await act(async () => result.current.resetar());
    expect(result.current).toMatchObject({ estado: "idle", erro: null });
  });

  it("personal não registra treino do aluno (permissão vem do use case)", async () => {
    const { Providers } = montar({ logado: PERSONAL });
    const { result } = await renderHook(() => useAtividades("ciclo-3"), { wrapper: Providers });
    await waitFor(() => expect(result.current.estado).toBe("idle"));
    await act(async () => {
      await result.current.registrar([treino]);
    });
    expect(result.current.erro).toBe("Só o aluno do ciclo registra treinos.");
  });
});

describe("useHistoricoRelatorios / useRelatorio", () => {
  it("lista e se atualiza sozinho quando outra tela escreve", async () => {
    const { Providers } = montar({ logado: ALUNO });
    const { result } = await renderHook(
      () => ({ historico: useHistoricoRelatorios(), atividades: useAtividades("ciclo-3") }),
      { wrapper: Providers },
    );
    await waitFor(() => expect(result.current.historico.estado).toBe("pronto"));
    const horasAntes = (result.current.historico as { dados: CicloLeitura[] }).dados.find((c) => c.id === "ciclo-3")!.horas.totais;

    await act(async () => {
      await result.current.atividades.registrar([treino]);
    });
    await waitFor(() => {
      const c = (result.current.historico as { dados: CicloLeitura[] }).dados.find((x) => x.id === "ciclo-3")!;
      expect(c.horas.totais).toBe(horasAntes + 2);
    });
  });

  it("erro ao listar vira estado de erro", async () => {
    const { Providers } = montar({
      logado: ALUNO,
      casos: { listarRelatorios: { execute: jest.fn().mockRejectedValue(new Error("x")) } },
    });
    const { result } = await renderHook(() => useHistoricoRelatorios(), { wrapper: Providers });
    await waitFor(() => expect(result.current).toEqual({ estado: "erro", mensagem: "Não foi possível carregar os relatórios." }));
  });

  it("relatório inexistente vira erro com a mensagem do use case", async () => {
    const { Providers } = montar({ logado: ALUNO });
    const { result } = await renderHook(() => useRelatorio("nao-existe"), { wrapper: Providers });
    await waitFor(() => expect(result.current).toEqual({ estado: "erro", mensagem: "Ciclo não encontrado." }));
  });
});

describe("useAcoesRelatorio", () => {
  it("coordenação aprova, sincroniza e gera PDF", async () => {
    const { Providers } = montar({ logado: COORDENACAO });
    const { result } = await renderHook(() => ({ acoes: useAcoesRelatorio("ciclo-2"), rel: useRelatorio("ciclo-2") }), {
      wrapper: Providers,
    });
    await waitFor(() => expect(result.current.rel.estado).toBe("pronto"));

    await act(async () => {
      await result.current.acoes.aprovar();
    });
    expect(result.current.acoes.mensagem).toBe("Relatório aprovado.");
    await waitFor(() => expect((result.current.rel as { dados: CicloLeitura }).dados.status).toBe("aprovado"));

    await act(async () => {
      await result.current.acoes.gerarPdf();
    });
    expect(result.current.acoes.erro).toMatch(/nuvem/); // assinaturas ainda locais

    await act(async () => {
      await result.current.acoes.sincronizar();
    });
    expect(result.current.acoes.mensagem).toMatch(/itens enviados — tudo sincronizado/);

    await act(async () => {
      await result.current.acoes.gerarPdf();
    });
    expect(result.current.acoes.mensagem).toBe("PDF gerado: memoria://relatorios/ciclo-2.pdf");
  });

  it("devolver com motivo curto é recusado; com motivo, devolve", async () => {
    const { Providers } = montar({ logado: COORDENACAO });
    const { result } = await renderHook(() => useAcoesRelatorio("ciclo-2"), { wrapper: Providers });
    await waitFor(() => expect(result.current.estado).toBe("idle"));

    await act(async () => {
      await result.current.devolver("refazer");
    });
    expect(result.current.erro).toMatch(/mínimo 10/);
    await act(async () => {
      await result.current.devolver("Faltou o treino de pernas.");
    });
    expect(result.current.mensagem).toBe("Relatório devolvido ao aluno.");
  });

  it("avaliar usa o use case certo pro papel", async () => {
    const avaliar = jest.fn().mockResolvedValue({ ok: true, valor: {} });
    const auto = jest.fn().mockResolvedValue({ ok: true, valor: {} });
    const casos = { avaliarDesempenho: { execute: avaliar }, realizarAutoAvaliacao: { execute: auto } };

    const p = montar({ logado: PERSONAL, casos });
    const { result: rp } = await renderHook(() => useAcoesRelatorio("ciclo-3"), { wrapper: p.Providers });
    await waitFor(() => expect(rp.current.estado).toBe("idle"));
    await act(async () => {
      await rp.current.avaliar([{ nome: "Frequência", nota: 8 }], "");
    });
    expect(avaliar).toHaveBeenCalledTimes(1);

    const a = montar({ logado: ALUNO, casos });
    const { result: ra } = await renderHook(() => useAcoesRelatorio("ciclo-3"), { wrapper: a.Providers });
    await waitFor(() => expect(ra.current.estado).toBe("idle"));
    await act(async () => {
      await ra.current.avaliar([{ nome: "Disciplina", nota: 8 }], "");
    });
    expect(auto).toHaveBeenCalledTimes(1);
  });

  it("sincronizar: offline e com falhas geram mensagens diferentes", async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce({ status: "offline", resumo: { pendentes: 3, comErro: 0, sincronizados: 0 } })
      .mockResolvedValueOnce({ status: "concluido", enviados: 2, falhas: 1, resumo: {} })
      .mockResolvedValueOnce({ status: "concluido", enviados: 1, falhas: 0, resumo: {} });
    const { Providers } = montar({ logado: ALUNO, casos: { sincronizarFila: { execute } } });
    const { result } = await renderHook(() => useAcoesRelatorio("ciclo-3"), { wrapper: Providers });
    await waitFor(() => expect(result.current.estado).toBe("idle"));

    const mensagens: (string | null)[] = [];
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.sincronizar();
      });
      mensagens.push(result.current.mensagem);
    }
    expect(mensagens).toEqual([
      "Sem conexão: tudo continua salvo no aparelho.",
      "2 enviados, 1 com erro (tentaremos de novo).",
      "1 item enviado — tudo sincronizado.",
    ]);
  });
});
