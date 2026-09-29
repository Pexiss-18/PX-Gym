import type { CicloAvaliacaoRepository, Clock } from "../../domain/contracts";
import { Criterio } from "../../domain/value-objects/criterio";
import type { UsuarioAutenticado } from "../../domain/value-objects/sessao";
import { paraLeitura, type CicloLeitura } from "./leitura-ciclo";
import { falha, falhaDoErro, sucesso, type Resultado } from "./resultado";
import type { CriterioInformado } from "./avaliar-desempenho";

/** O aluno se autoavalia no mesmo formato de critérios. */
export class RealizarAutoAvaliacaoUseCase {
  constructor(
    private readonly ciclos: CicloAvaliacaoRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    usuario: UsuarioAutenticado;
    cicloId: string;
    criterios: CriterioInformado[];
    comentario: string;
  }): Promise<Resultado<CicloLeitura>> {
    const ciclo = await this.ciclos.porId(input.cicloId);
    if (!ciclo) return falha("nao-encontrado", "Ciclo não encontrado.");
    if (input.usuario.papel !== "aluno" || ciclo.alunoId !== input.usuario.id) {
      return falha("sem-permissao", "Só o aluno do ciclo faz a autoavaliação.");
    }
    try {
      ciclo.registrarAutoAvaliacao({
        criterios: input.criterios.map((c) => Criterio.criar(c.nome, c.nota)),
        comentario: input.comentario,
        agora: this.clock.now(),
      });
      await this.ciclos.salvar(ciclo);
      return sucesso(paraLeitura(ciclo));
    } catch (erro) {
      return falhaDoErro(erro);
    }
  }
}
