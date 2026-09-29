import type { CicloAvaliacaoRepository, Clock } from "../../domain/contracts";
import type { UsuarioAutenticado } from "../../domain/value-objects/sessao";
import { paraLeitura, type CicloLeitura } from "./leitura-ciclo";
import { falha, falhaDoErro, sucesso, type Resultado } from "./resultado";

/** A coordenação aprova o relatório assinado. */
export class AprovarRelatorioUseCase {
  constructor(
    private readonly ciclos: CicloAvaliacaoRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    usuario: UsuarioAutenticado;
    cicloId: string;
  }): Promise<Resultado<CicloLeitura>> {
    if (input.usuario.papel !== "coordenacao") {
      return falha("sem-permissao", "Só a coordenação aprova relatórios.");
    }
    const ciclo = await this.ciclos.porId(input.cicloId);
    if (!ciclo) return falha("nao-encontrado", "Ciclo não encontrado.");
    try {
      ciclo.aprovar(this.clock.now());
      await this.ciclos.salvar(ciclo);
      return sucesso(paraLeitura(ciclo));
    } catch (erro) {
      return falhaDoErro(erro);
    }
  }
}
