import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  CRITERIOS_AUTOAVALIACAO,
  CRITERIOS_PERSONAL,
  Criterio,
  DESCRICAO_FAIXA,
} from "@px/core";
import { colors, glass, radius, spacing } from "@px/tokens";
import { useUsuario } from "../hooks/useAuth";
import { useAcoesRelatorio } from "../hooks/useRelatorios";
import { Aviso, Botao, Campo, Cartao, Linha, Tela, fontes, styles as ui } from "./ui";

/**
 * Avaliação por critérios: o personal avalia o aluno; o aluno se
 * autoavalia. Mesma tela, critérios e use case diferentes conforme o papel.
 */
export function AvaliacaoScreen({ cicloId, onVoltar }: { cicloId: string; onVoltar: () => void }) {
  const usuario = useUsuario();
  const acoes = useAcoesRelatorio(cicloId);
  const personal = usuario.papel === "personal";
  const nomes = personal ? CRITERIOS_PERSONAL : CRITERIOS_AUTOAVALIACAO;
  const [notas, setNotas] = useState<number[]>(() => nomes.map(() => 7));
  const [comentario, setComentario] = useState("");

  const mudar = (i: number, delta: number) =>
    setNotas((n) => n.map((v, j) => (j === i ? Math.max(0, Math.min(10, v + delta)) : v)));

  return (
    <Tela
      titulo={personal ? "Avaliar desempenho" : "Autoavaliação"}
      subtitulo="Notas de 0 a 10, de meio em meio ponto."
      onVoltar={onVoltar}
    >
      {nomes.map((nome, i) => {
        const nota = notas[i]!;
        const faixa = Criterio.criar(nome, nota).faixa;
        return (
          <Cartao key={nome}>
            <Linha>
              <Text style={[ui.texto, styles.flex]}>{nome}</Text>
              <Text style={styles.faixa}>
                {faixa} · {DESCRICAO_FAIXA[faixa]}
              </Text>
            </Linha>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => mudar(i, -0.5)}
                accessibilityRole="button"
                accessibilityLabel={`Diminuir ${nome}`}
                style={styles.passo}
              >
                <Text style={styles.passoTexto}>−</Text>
              </Pressable>
              <Text style={styles.nota} accessibilityLabel={`Nota de ${nome}`}>
                {String(nota).replace(".", ",")}
              </Text>
              <Pressable
                onPress={() => mudar(i, 0.5)}
                accessibilityRole="button"
                accessibilityLabel={`Aumentar ${nome}`}
                style={styles.passo}
              >
                <Text style={styles.passoTexto}>+</Text>
              </Pressable>
            </View>
          </Cartao>
        );
      })}

      <Campo rotulo="Comentário (opcional)" value={comentario} onChangeText={setComentario} multiline />

      {acoes.erro ? <Aviso tipo="erro" texto={acoes.erro} /> : null}
      {acoes.mensagem ? <Aviso tipo="sucesso" texto={acoes.mensagem} /> : null}

      {acoes.estado === "salvo" ? (
        <Botao titulo="Voltar ao relatório" onPress={onVoltar} />
      ) : (
        <Botao
          titulo="Salvar avaliação"
          carregando={acoes.estado === "salvando"}
          onPress={() =>
            void acoes.avaliar(
              nomes.map((nome, i) => ({ nome, nota: notas[i]! })),
              comentario,
            )
          }
        />
      )}
    </Tela>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  faixa: { color: colors.voltLime, fontSize: 12, fontFamily: fontes.semibold },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg },
  passo: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: glass.fillStrong,
    borderWidth: 1,
    borderColor: colors.hairlineBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  passoTexto: { color: colors.paperForeground, fontSize: 22, fontFamily: fontes.medio },
  nota: { color: colors.paperForeground, fontSize: 28, fontFamily: fontes.mono, minWidth: 64, textAlign: "center" },
});
