import * as SecureStore from "expo-secure-store";
import type { Papel, Sessao, SessionStorage } from "@px/core";

export const CHAVE_SESSAO = "pxgym.sessao";

const PAPEIS: readonly Papel[] = ["aluno", "personal", "coordenacao"];

/** Formato gravado: Date vira ISO string (o SecureStore só guarda texto). */
type SessaoGravada = {
  usuario: { id: string; nome: string; email: string; papel: Papel };
  token: string;
  expiraEm: string | null;
};

/**
 * SessionStorage sobre o expo-secure-store: o token fica cifrado pelo
 * sistema (Keychain no iOS, Keystore no Android), nunca em AsyncStorage.
 * Conteúdo corrompido ou de formato antigo é descartado: melhor pedir login
 * de novo do que entrar com uma sessão pela metade.
 */
export class SessionStorageSecureStore implements SessionStorage {
  constructor(private readonly chave = CHAVE_SESSAO) {}

  async salvar(sessao: Sessao): Promise<void> {
    const gravada: SessaoGravada = {
      usuario: { ...sessao.usuario },
      token: sessao.token,
      expiraEm: sessao.expiraEm ? sessao.expiraEm.toISOString() : null,
    };
    await SecureStore.setItemAsync(this.chave, JSON.stringify(gravada), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async carregar(): Promise<Sessao | null> {
    const texto = await SecureStore.getItemAsync(this.chave);
    if (!texto) return null;
    const sessao = ler(texto);
    if (!sessao) await this.limpar();
    return sessao;
  }

  async limpar(): Promise<void> {
    await SecureStore.deleteItemAsync(this.chave);
  }
}

function ler(texto: string): Sessao | null {
  try {
    const g = JSON.parse(texto) as Partial<SessaoGravada>;
    const u = g.usuario;
    if (
      !u ||
      typeof u.id !== "string" ||
      typeof u.nome !== "string" ||
      typeof u.email !== "string" ||
      !PAPEIS.includes(u.papel as Papel) ||
      typeof g.token !== "string"
    ) {
      return null;
    }
    const expiraEm = g.expiraEm ? new Date(g.expiraEm) : null;
    if (expiraEm && Number.isNaN(expiraEm.getTime())) return null;
    return {
      usuario: { id: u.id, nome: u.nome, email: u.email, papel: u.papel as Papel },
      token: g.token,
      expiraEm,
    };
  } catch {
    return null;
  }
}
