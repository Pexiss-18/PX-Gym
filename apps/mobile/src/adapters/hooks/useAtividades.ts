import { useCallback, useState } from "react";
import type { NovaAtividade } from "@px/core";
import { useCasosDeUso } from "../context/CasosDeUsoContext";
import { useUsuario } from "./useAuth";

export type EstadoEnvio = "idle" | "salvando" | "salvo" | "erro";

/**
 * Ponte entre o formulário de treinos e o RegistrarAtividadesUseCase:
 * traduz a Promise do use case pro ciclo de vida da tela
 * (idle → salvando → salvo | erro). A tela não sabe que use case existe.
 */
export function useAtividades(cicloId: string) {
  const { casos, notificarMudanca } = useCasosDeUso();
  const usuario = useUsuario();
  const [estado, setEstado] = useState<EstadoEnvio>("idle");
  const [erro, setErro] = useState<string | null>(null);

  const registrar = useCallback(
    async (atividades: NovaAtividade[]): Promise<boolean> => {
      setEstado("salvando");
      setErro(null);
      const r = await casos.registrarAtividades.execute({ usuario, cicloId, atividades });
      if (!r.ok) {
        setEstado("erro");
        setErro(r.erro.mensagem);
        return false;
      }
      setEstado("salvo");
      notificarMudanca();
      return true;
    },
    [casos, usuario, cicloId, notificarMudanca],
  );

  const resetar = useCallback(() => {
    setEstado("idle");
    setErro(null);
  }, []);

  return { estado, erro, registrar, resetar };
}
