import { useCallback, useEffect, useState } from "react";
import type { CicloLeitura, CriterioInformado, Resultado } from "@px/core";
import { useCasosDeUso } from "../context/CasosDeUsoContext";
import { useUsuario } from "./useAuth";
import type { EstadoEnvio } from "./useAtividades";

type EstadoConsulta<T> =
  | { estado: "carregando" }
  | { estado: "pronto"; dados: T }
  | { estado: "erro"; mensagem: string };

/** Histórico de relatórios do usuário logado; recarrega quando algo muda. */
export function useHistoricoRelatorios() {
  const { casos, versao } = useCasosDeUso();
  const usuario = useUsuario();
  const [consulta, setConsulta] = useState<EstadoConsulta<CicloLeitura[]>>({
    estado: "carregando",
  });

  useEffect(() => {
    let ativo = true;
    casos.listarRelatorios
      .execute({ usuario })
      .then((dados) => ativo && setConsulta({ estado: "pronto", dados }))
      .catch(() => ativo && setConsulta({ estado: "erro", mensagem: "Não foi possível carregar os relatórios." }));
    return () => {
      ativo = false;
    };
  }, [casos, usuario, versao]);

  return consulta;
}

/** Um relatório, sempre em dia com as escritas feitas em outras telas. */
export function useRelatorio(cicloId: string) {
  const { casos, versao } = useCasosDeUso();
  const usuario = useUsuario();
  const [consulta, setConsulta] = useState<EstadoConsulta<CicloLeitura>>({
    estado: "carregando",
  });

  useEffect(() => {
    let ativo = true;
    casos.consultarRelatorio.execute({ usuario, cicloId }).then((r) => {
      if (!ativo) return;
      setConsulta(r.ok ? { estado: "pronto", dados: r.valor } : { estado: "erro", mensagem: r.erro.mensagem });
    });
    return () => {
      ativo = false;
    };
  }, [casos, usuario, cicloId, versao]);

  return consulta;
}

/**
 * Ações sobre um relatório (assinar, avaliar, aprovar, devolver, PDF,
 * sincronizar), todas com o mesmo ciclo de vida idle → salvando → salvo|erro.
 */
export function useAcoesRelatorio(cicloId: string) {
  const { casos, notificarMudanca } = useCasosDeUso();
  const usuario = useUsuario();
  const [estado, setEstado] = useState<EstadoEnvio>("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const rodar = useCallback(
    async <T,>(acao: () => Promise<Resultado<T>>, sucesso: (valor: T) => string) => {
      setEstado("salvando");
      setErro(null);
      setMensagem(null);
      const r = await acao();
      if (!r.ok) {
        setEstado("erro");
        setErro(r.erro.mensagem);
        return false;
      }
      setEstado("salvo");
      setMensagem(sucesso(r.valor));
      notificarMudanca();
      return true;
    },
    [notificarMudanca],
  );

  const base = { usuario, cicloId };

  return {
    estado,
    erro,
    mensagem,
    assinar: (assinaturaBase64: string) =>
      rodar(() => casos.assinarRelatorio.execute({ ...base, assinaturaBase64 }), (c) =>
        c.status === "aguardando_aprovacao"
          ? "Assinado! O relatório foi para a coordenação."
          : "Assinado! Falta a outra assinatura.",
      ),
    avaliar: (criterios: CriterioInformado[], comentario: string) =>
      rodar(
        () =>
          usuario.papel === "personal"
            ? casos.avaliarDesempenho.execute({ ...base, criterios, comentario })
            : casos.realizarAutoAvaliacao.execute({ ...base, criterios, comentario }),
        () => "Avaliação salva.",
      ),
    aprovar: () => rodar(() => casos.aprovarRelatorio.execute(base), () => "Relatório aprovado."),
    devolver: (motivo: string) =>
      rodar(() => casos.devolverRelatorio.execute({ ...base, motivo }), () => "Relatório devolvido ao aluno."),
    gerarPdf: () => rodar(() => casos.gerarPdf.execute(base), ({ uri }) => `PDF gerado: ${uri}`),
    sincronizar: () =>
      rodar(
        async () => ({ ok: true as const, valor: await casos.sincronizarFila.execute() }),
        (r) =>
          r.status === "offline"
            ? "Sem conexão: tudo continua salvo no aparelho."
            : r.falhas > 0
              ? `${r.enviados} enviados, ${r.falhas} com erro (tentaremos de novo).`
              : `${r.enviados} ${r.enviados === 1 ? "item enviado" : "itens enviados"} — tudo sincronizado.`,
      ),
  };
}
