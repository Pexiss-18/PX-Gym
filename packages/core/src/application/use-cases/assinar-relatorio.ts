import type { CicloAvaliacaoRepository, Clock } from "../../domain/contracts";
import type { Signatario } from "../../domain/entities/ciclo-avaliacao";
import { Assinatura } from "../../domain/value-objects/assinatura";
import type { UsuarioAutenticado } from "../../domain/value-objects/sessao";
import { paraLeitura, type CicloLeitura } from "./leitura-ciclo";
import { falha, falhaDoErro, sucesso, type Resultado } from "./resultado";

/** Aluno ou personal do ciclo assina o relatório. */
export class AssinarRelatorioUseCase {
  constructor(
    private readonly ciclos: CicloAvaliacaoRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    usuario: UsuarioAutenticado;
    cicloId: string;
    assinaturaBase64: string;
  }): Promise<Resultado<CicloLeitura>> {
    const ciclo = await this.ciclos.porId(input.cicloId);
    if (!ciclo) return falha("nao-encontrado", "Ciclo não encontrado.");

    let signatario: Signatario;
    if (input.usuario.papel === "aluno" && ciclo.alunoId === input.usuario.id) {
      signatario = "aluno";
    } else if (input.usuario.papel === "personal" && ciclo.personalId === input.usuario.id) {
      signatario = "personal";
    } else {
      return falha("sem-permissao", "Só o aluno e o personal do ciclo assinam.");
    }

    try {
      ciclo.assinar(
        signatario,
        Assinatura.criar(input.assinaturaBase64, this.clock.now()),
      );
      await this.ciclos.salvar(ciclo);
      return sucesso(paraLeitura(ciclo));
    } catch (erro) {
      return falhaDoErro(erro);
    }
  }
}
