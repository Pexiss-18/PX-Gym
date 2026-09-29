import type { CicloAvaliacaoRepository, Clock } from "../../domain/contracts";
import { RegraDevolucaoService } from "../../domain/services/regra-devolucao";
import type { UsuarioAutenticado } from "../../domain/value-objects/sessao";
import { paraLeitura, type CicloLeitura } from "./leitura-ciclo";
import { falha, falhaDoErro, sucesso, type Resultado } from "./resultado";

/** A coordenação devolve o relatório pra correção, com motivo. */
export class DevolverRelatorioUseCase {
  constructor(
    private readonly ciclos: CicloAvaliacaoRepository,
    private readonly clock: Clock,
    private readonly regra = new RegraDevolucaoService(),
  ) {}

  async execute(input: {
    usuario: UsuarioAutenticado;
    cicloId: string;
    motivo: string;
  }): Promise<Resultado<CicloLeitura>> {
    const ciclo = await this.ciclos.porId(input.cicloId);
    if (!ciclo) return falha("nao-encontrado", "Ciclo não encontrado.");

    const verificacao = this.regra.verificar({
      ciclo,
      papel: input.usuario.papel,
      motivo: input.motivo,
    });
    if (!verificacao.permitido) {
      const tipo =
        verificacao.motivo === "sem-permissao"
          ? "sem-permissao"
          : verificacao.motivo === "motivo-curto"
            ? "dados-invalidos"
            : "regra-de-negocio";
      return falha(tipo, verificacao.mensagem);
    }

    try {
      ciclo.devolver(input.motivo, this.clock.now());
      await this.ciclos.salvar(ciclo);
      return sucesso(paraLeitura(ciclo));
    } catch (erro) {
      return falhaDoErro(erro);
    }
  }
}
