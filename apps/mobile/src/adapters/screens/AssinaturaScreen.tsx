import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@px/tokens";
import { useUsuario } from "../hooks/useAuth";
import { useAcoesRelatorio, useRelatorio } from "../hooks/useRelatorios";
import { svgParaBase64, tracosParaSvg, type Traco } from "./assinatura-svg";
import { horas } from "./formato";
import { QuadroAssinatura } from "./QuadroAssinatura";
import { Aviso, Botao, Carregando, Cartao, Linha, Tela, styles as ui } from "./ui";

/**
 * Assinatura digital do relatório (aluno ou personal). O desenho vira SVG
 * em base64 e vai pro AssinarRelatorioUseCase — o Value Object Assinatura
 * decide se é uma assinatura de verdade ou um toque acidental.
 */
export function AssinaturaScreen({
  cicloId,
  onVoltar,
}: {
  cicloId: string;
  onVoltar: () => void;
}) {
  const usuario = useUsuario();
  const consulta = useRelatorio(cicloId);
  const acoes = useAcoesRelatorio(cicloId);
  const [tracos, setTracos] = useState<Traco[]>([]);
  const [tamanho, setTamanho] = useState({ largura: 300, altura: 180 });

  async function confirmar() {
    const base64 = tracos.length ? svgParaBase64(tracosParaSvg(tracos, tamanho.largura, tamanho.altura)) : "";
    if (await acoes.assinar(base64)) setTracos([]);
  }

  if (consulta.estado !== "pronto") {
    return (
      <Tela titulo="Assinar relatório" onVoltar={onVoltar}>
        {consulta.estado === "carregando" ? <Carregando /> : <Aviso tipo="erro" texto={consulta.mensagem} />}
      </Tela>
    );
  }

  const ciclo = consulta.dados;
  const assinado = acoes.estado === "salvo";

  return (
    <Tela titulo="Assinar relatório" subtitulo={ciclo.titulo} onVoltar={onVoltar}>
      <Cartao>
        <Linha>
          <Text style={ui.textoFraco}>Treinos registrados</Text>
          <Text style={ui.numero}>{ciclo.atividades.length}</Text>
        </Linha>
        <Linha>
          <Text style={ui.textoFraco}>Carga horária</Text>
          <Text style={ui.numero}>{horas(ciclo.horas.totais)}</Text>
        </Linha>
        <Linha>
          <Text style={ui.textoFraco}>Média do personal</Text>
          <Text style={ui.numero}>{ciclo.avaliacaoPersonal ? String(ciclo.avaliacaoPersonal.media).replace(".", ",") : "—"}</Text>
        </Linha>
      </Cartao>

      <Text style={ui.texto}>
        {usuario.papel === "personal"
          ? "Declaro que acompanhei os treinos deste ciclo e que a avaliação reflete o desempenho do aluno."
          : "Declaro que os treinos e a autoavaliação deste ciclo são verdadeiros."}
      </Text>

      {!assinado ? (
        <QuadroAssinatura
          tracos={tracos}
          onChange={(t, tam) => {
            setTracos(t);
            setTamanho(tam);
          }}
        />
      ) : null}

      {acoes.erro ? <Aviso tipo="erro" texto={acoes.erro} /> : null}
      {acoes.mensagem ? <Aviso tipo="sucesso" texto={acoes.mensagem} /> : null}

      {assinado ? (
        <Botao titulo="Voltar ao relatório" onPress={onVoltar} />
      ) : (
        <View style={styles.botoes}>
          <View style={styles.flex}>
            <Botao titulo="Limpar" variante="secundario" desabilitado={!tracos.length} onPress={() => setTracos([])} />
          </View>
          <View style={styles.flex}>
            <Botao
              titulo="Confirmar assinatura"
              carregando={acoes.estado === "salvando"}
              onPress={() => void confirmar()}
            />
          </View>
        </View>
      )}
    </Tela>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  botoes: { flexDirection: "row", gap: spacing.xs },
});
