import { useContext } from "react";
import type { UsuarioAutenticado } from "@px/core";
import { AuthContext, type EstadoAuth } from "../context/AuthContext";

/** Sessão global lida do <AuthProvider>. */
export function useAuth(): EstadoAuth {
  const estado = useContext(AuthContext);
  if (!estado) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return estado;
}

/**
 * Atalho pras telas da área logada, que só existem com sessão (o layout
 * raiz protege as rotas). Lança se for usado fora dela — erro de navegação,
 * não de usuário.
 */
export function useUsuario(): UsuarioAutenticado {
  const { sessao } = useAuth();
  if (!sessao) throw new Error("useUsuario usado fora da área logada");
  return sessao.usuario;
}
