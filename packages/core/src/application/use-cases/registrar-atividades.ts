import type { CicloAvaliacaoRepository, IdGenerator } from "../../domain/contracts";
import { Coordenada } from "../../domain/value-objects/coordenada";
import type { UsuarioAutenticado } from "../../domain/value-objects/sessao";
import { paraLeitura, type CicloLeitura } from "./leitura-ciclo";
import { falha, falhaDoErro, sucesso, type Resultado } from "./resultado";

export type NovaAtividade = {
  data: string;
  descricao: string;
  horas: number;
  local: { latitude: number; longitude: number; timestamp: Date } | null;
};

/**
 * O aluno registra um ou mais treinos no ciclo. Tudo ou nada: se um treino
 * do lote quebrar uma regra, nenhum é salvo (o agregado só é gravado no fim).
 */
export class RegistrarAtividadesUseCase {
  constructor(
    private readonly ciclos: CicloAvaliacaoRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: {
    usuario: UsuarioAutenticado;
    cicloId: string;
    atividades: NovaAtividade[];
  }): Promise<Resultado<CicloLeitura>> {
    if (input.atividades.length === 0) {
      return falha("dados-invalidos", "Nenhum treino para registrar.");
    }
    const ciclo = await this.ciclos.porId(input.cicloId);
    if (!ciclo) return falha("nao-encontrado", "Ciclo não encontrado.");
    if (input.usuario.papel !== "aluno" || ciclo.alunoId !== input.usuario.id) {
      return falha("sem-permissao", "Só o aluno do ciclo registra treinos.");
    }

    try {
      for (const a of input.atividades) {
        ciclo.registrarAtividade({
          id: this.ids.next(),
          data: a.data,
          descricao: a.descricao,
          horas: a.horas,
          local: a.local
            ? Coordenada.criar(a.local.latitude, a.local.longitude, a.local.timestamp)
            : null,
        });
      }
      await this.ciclos.salvar(ciclo);
      return sucesso(paraLeitura(ciclo));
    } catch (erro) {
      return falhaDoErro(erro);
    }
  }
}
