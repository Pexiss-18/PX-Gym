/**
 * Quem usa o app. Aluno treina e registra; personal (o orientador) avalia e
 * assina; coordenação da academia aprova ou devolve o relatório.
 */
export type Papel = "aluno" | "personal" | "coordenacao";

export const ROTULO_PAPEL: Record<Papel, string> = {
  aluno: "Aluno",
  personal: "Personal",
  coordenacao: "Coordenação",
};

export type UsuarioAutenticado = {
  readonly id: string;
  readonly nome: string;
  readonly email: string;
  readonly papel: Papel;
};

/**
 * Sessão autenticada. `expiraEm` null = o provedor renova sozinho (Supabase);
 * data = sessão que morre (acesso de personal via token).
 */
export type Sessao = {
  readonly usuario: UsuarioAutenticado;
  readonly token: string;
  readonly expiraEm: Date | null;
};

export function sessaoValida(sessao: Sessao, agora: Date): boolean {
  return sessao.expiraEm === null || sessao.expiraEm.getTime() > agora.getTime();
}
