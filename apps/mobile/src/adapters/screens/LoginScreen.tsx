import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@px/tokens";
import { useAuth } from "../hooks/useAuth";
import { Aviso, Botao, Campo, Cartao, Tela, fontes, styles as ui } from "./ui";

export type ContaDemo = { rotulo: string; email: string; senha: string };

/**
 * Login. Fala só com o useAuth (Context API); quem valida e-mail/senha é o
 * AutenticarUsuarioUseCase por trás dele. `contasDemo` mostra atalhos pras
 * contas do stub — só no modo de demonstração.
 */
export function LoginScreen({
  onCriarConta,
  onAcessoPersonal,
  contasDemo = [],
}: {
  onCriarConta: () => void;
  onAcessoPersonal: () => void;
  contasDemo?: ContaDemo[];
}) {
  const { entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [estado, setEstado] = useState<"idle" | "entrando">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    setEstado("entrando");
    setErro(null);
    const r = await entrar(email, senha);
    // Sucesso: o layout raiz troca pra área logada sozinho (Stack.Protected).
    if (r.erro) {
      setErro(r.erro);
      setEstado("idle");
    }
  }

  return (
    <Tela titulo="Entrar" subtitulo="Px GYM — treino, relatório e evolução.">
      <Cartao>
        <Campo
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="current-password" />
        {erro ? <Aviso tipo="erro" texto={erro} /> : null}
        <Botao titulo="Entrar" carregando={estado === "entrando"} onPress={() => void enviar()} />
      </Cartao>

      {contasDemo.length > 0 ? (
        <Cartao>
          <Text style={ui.textoFraco}>Modo demonstração — entrar como:</Text>
          <View style={styles.chips}>
            {contasDemo.map((c) => (
              <Pressable
                key={c.email}
                onPress={() => {
                  setEmail(c.email);
                  setSenha(c.senha);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Preencher conta ${c.rotulo}`}
                style={styles.chip}
              >
                <Text style={styles.chipTexto}>{c.rotulo}</Text>
              </Pressable>
            ))}
          </View>
        </Cartao>
      ) : null}

      <View style={styles.links}>
        <Pressable onPress={onCriarConta} accessibilityRole="link">
          <Text style={styles.link}>Criar conta</Text>
        </Pressable>
        <Pressable onPress={onAcessoPersonal} accessibilityRole="link">
          <Text style={styles.link}>Sou personal, tenho um código</Text>
        </Pressable>
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairlineBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipTexto: { color: colors.paperForeground, fontSize: 13, fontFamily: fontes.medio },
  links: { alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  link: { color: colors.voltLime, fontSize: 14, fontFamily: fontes.medio },
});
