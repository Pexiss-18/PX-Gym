import type { CicloAvaliacaoRepository } from "../../domain/contracts";
import type { CicloAvaliacao } from "../../domain/entities/ciclo-avaliacao";
import type { UsuarioAutenticado } from "../../domain/value-objects/sessao";
import { paraLeitura, podeVer, type CicloLeitura } from "./leitura-ciclo";
import { falha, sucesso, type Resultado } from "./resultado";

/** Histórico de relatórios de quem está logado, do mais recente pro mais antigo. */
export class ListarRelatoriosUseCase {
  constructor(private readonly ciclos: CicloAvaliacaoRepository) {}

  async execute(input: { usuario: UsuarioAutenticado }): Promise<CicloLeitura[]> {
    const { usuario } = input;
    let lista: CicloAvaliacao[];
    switch (usuario.papel) {
      case "aluno":
        lista = await this.ciclos.listarPorAluno(usuario.id);
        break;
      case "personal":
        lista = await this.ciclos.listarPorPersonal(usuario.id);
        break;
      case "coordenacao":
        lista = await this.ciclos.listarTodos();
        break;
    }
    return lista
      .sort((a, b) => b.inicio.localeCompare(a.inicio))
      .map(paraLeitura);
  }
}

/** Um relatório só, com checagem de acesso. */
export class ConsultarRelatorioUseCase {
  constructor(private readonly ciclos: CicloAvaliacaoRepository) {}

  async execute(input: {
    usuario: UsuarioAutenticado;
    cicloId: string;
  }): Promise<Resultado<CicloLeitura>> {
    const ciclo = await this.ciclos.porId(input.cicloId);
    if (!ciclo) return falha("nao-encontrado", "Ciclo não encontrado.");
    if (!podeVer(input.usuario, ciclo)) {
      return falha("sem-permissao", "Você não participa deste ciclo.");
    }
    return sucesso(paraLeitura(ciclo));
  }
}
