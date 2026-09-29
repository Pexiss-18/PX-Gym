import { Pressable, StyleSheet, Text, View } from "react-native";
import { ROTULO_PAPEL } from "@px/core";
import { colors, spacing } from "@px/tokens";
import { useAuth } from "../hooks/useAuth";
import { useHistoricoRelatorios } from "../hooks/useRelatorios";
import { TOM_STATUS, dataBr, horas, pendentesDeEnvio } from "./formato";
import {
  Aviso,
  BarraProgresso,
  Botao,
  Carregando,
  Linha,
  Selo,
  Tela,
  fontes,
  styles as ui,
} from "./ui";

/**
 * Histórico de relatórios de ciclo. O que aparece depende do papel: o
 * aluno vê os seus, o personal os dos alunos dele, a coordenação todos.
 */
export function HistoricoRelatoriosScreen({
  onAbrir,
  onVoltar,
}: {
  onAbrir: (cicloId: string) => void;
  onVoltar?: () => void;
}) {
  const { sessao, sair } = useAuth();
  const consulta = useHistoricoRelatorios();
  const usuario = sessao!.usuario;

  return (
    <Tela
      titulo="Relatórios do ciclo"
      subtitulo={`${usuario.nome} · ${ROTULO_PAPEL[usuario.papel]}`}
      onVoltar={onVoltar}
    >
      {consulta.estado === "carregando" ? <Carregando /> : null}
      {consulta.estado === "erro" ? <Aviso tipo="erro" texto={consulta.mensagem} /> : null}
      {consulta.estado === "pronto" && consulta.dados.length === 0 ? (
        <Aviso tipo="info" texto="Nenhum relatório por aqui ainda." />
      ) : null}

      {consulta.estado === "pronto"
        ? consulta.dados.map((c) => {
            const pendentes = pendentesDeEnvio(c);
            return (
              <Pressable
                key={c.id}
                onPress={() => onAbrir(c.id)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${c.titulo}`}
                style={({ pressed }) => [ui.cartao, pressed && ui.pressionado]}
              >
                <Linha>
                  <Text style={[ui.textoForte, styles.flex]} numberOfLines={2}>
                    {c.titulo}
                  </Text>
                  <Selo texto={c.rotuloStatus} tom={TOM_STATUS[c.status]} />
                </Linha>
                <Text style={ui.textoFraco}>
                  {dataBr(c.inicio)} a {dataBr(c.fim)}
                </Text>
                <View style={styles.horas}>
                  <Linha>
                    <Text style={ui.textoFraco}>Carga horária</Text>
                    <Text style={styles.numero}>
                      {horas(c.horas.totais)} / {horas(c.horas.minimas)}
                    </Text>
                  </Linha>
                  <BarraProgresso valor={c.horas.progresso} rotulo={`Horas de ${c.titulo}`} />
                </View>
                <View style={styles.sync}>
                  <View
                    style={[styles.ponto, { backgroundColor: pendentes ? colors.carbsAmber : colors.voltLime }]}
                  />
                  <Text style={ui.textoFraco}>
                    {pendentes
                      ? `${pendentes} ${pendentes === 1 ? "item" : "itens"} aguardando envio`
                      : "Tudo sincronizado"}
                  </Text>
                </View>
              </Pressable>
            );
          })
        : null}

      <View style={styles.sair}>
        <Botao titulo="Sair" variante="secundario" onPress={() => void sair()} />
      </View>
    </Tela>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  horas: { gap: 6, marginTop: spacing.xs },
  numero: { color: colors.paperForeground, fontSize: 13, fontFamily: fontes.mono },
  sync: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  sair: { marginTop: spacing.md },
});
