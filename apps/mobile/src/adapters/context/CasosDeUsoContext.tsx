import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { CasosDeUso } from "../composicao";

/**
 * Injeção de dependência pela árvore React: o app entrega os use cases
 * montados no composition root; o teste entrega fakes. Hooks e telas
 * pedem daqui — nunca dão `new` em use case nenhum.
 *
 * `versao` sobe a cada escrita bem-sucedida: é como a tela de histórico
 * sabe que o formulário de outra tela mudou um relatório.
 */
type ValorCasosDeUso = {
  casos: CasosDeUso;
  versao: number;
  notificarMudanca(): void;
};

const CasosDeUsoContext = createContext<ValorCasosDeUso | null>(null);

export function CasosDeUsoProvider({
  casos,
  children,
}: PropsWithChildren<{ casos: CasosDeUso }>) {
  const [versao, setVersao] = useState(0);
  const notificarMudanca = useCallback(() => setVersao((v) => v + 1), []);
  const valor = useMemo(
    () => ({ casos, versao, notificarMudanca }),
    [casos, versao, notificarMudanca],
  );
  return <CasosDeUsoContext.Provider value={valor}>{children}</CasosDeUsoContext.Provider>;
}

export function useCasosDeUso(): ValorCasosDeUso {
  const valor = useContext(CasosDeUsoContext);
  if (!valor) throw new Error("useCasosDeUso precisa estar dentro de <CasosDeUsoProvider>");
  return valor;
}
