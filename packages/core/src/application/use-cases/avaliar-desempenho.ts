import type { CicloAvaliacaoRepository, Clock } from "../../domain/contracts";
import { Criterio } from "../../domain/value-objects/criterio";
import type { UsuarioAutenticado } from "../../domain/value-objects/sessao";
import { paraLeitura, type CicloLeitura } from "./leitura-ciclo";
import { falha, falhaDoErro, sucesso, type Resultado } from "./resultado";

export type CriterioInformado = { nome: string; nota: number };

/** Critérios sugeridos na tela — o domínio aceita quaisquer outros. */
export const CRITERIOS_PERSONAL = [
  "Execução técnica",
  "Evolução de carga",
  "Frequência",
  "Postura e segurança",
] as const;

export const CRITERIOS_AUTOAVALIACAO = [
  "Disciplina",
  "Alimentação",
  "Sono e recuperação",
  "Esforço nos treinos",
] as const;

/** O personal do ciclo avalia o desempenho do aluno. */
export class AvaliarDesempenhoUseCase {
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
    if (input.usuario.papel !== "personal" || ciclo.personalId !== input.usuario.id) {
      return falha("sem-permissao", "Só o personal do ciclo avalia o desempenho.");
    }
    try {
      ciclo.registrarAvaliacaoPersonal({
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
