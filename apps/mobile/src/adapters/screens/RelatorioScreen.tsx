import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DESCRICAO_FAIXA, type AvaliacaoLeitura, type CicloLeitura } from "@px/core";
import { colors, spacing } from "@px/tokens";
import { useUsuario } from "../hooks/useAuth";
import { useAcoesRelatorio, useRelatorio } from "../hooks/useRelatorios";
import { Rubrica } from "./Rubrica";
import { ROTULO_SYNC, TOM_STATUS, dataBr, horas, pendentesDeEnvio } from "./formato";
import {
  Aviso,
  BarraProgresso,
  Botao,
  Campo,
  Carregando,
  Cartao,
  Linha,
  Selo,
  Tela,
  TituloSecao,
  fontes,
  styles as ui,
} from "./ui";

/**
 * Detalhe do relatório do ciclo. As ações mudam com o papel e o status,
 * mas a tela não decide regra nenhuma: mostra o que a leitura do use case
 * diz (editável? pendências? PDF liberado?) e repassa o toque pro hook.
 */
export function RelatorioScreen({
  cicloId,
  onVoltar,
  onRegistrarTreino,
  onAvaliar,
  onAssinar,
}: {
  cicloId: string;
  onVoltar: () => void;
  onRegistrarTreino: () => void;
  onAvaliar: () => void;
  onAssinar: () => void;
}) {
  const consulta = useRelatorio(cicloId);

  if (consulta.estado !== "pronto") {
    return (
      <Tela titulo="Relatório" onVoltar={onVoltar}>
        {consulta.estado === "carregando" ? <Carregando /> : <Aviso tipo="erro" texto={consulta.mensagem} />}
      </Tela>
    );
  }

  return (
    <Conteudo
      ciclo={consulta.dados}
      onVoltar={onVoltar}
      onRegistrarTreino={onRegistrarTreino}
      onAvaliar={onAvaliar}
      onAssinar={onAssinar}
    />
  );
}

function Conteudo({
  ciclo,
  onVoltar,
  onRegistrarTreino,
  onAvaliar,
  onAssinar,
}: {
  ciclo: CicloLeitura;
  onVoltar: () => void;
  onRegistrarTreino: () => void;
  onAvaliar: () => void;
  onAssinar: () => void;
}) {
  const usuario = useUsuario();
  const acoes = useAcoesRelatorio(ciclo.id);
  const [motivo, setMotivo] = useState("");
  const [devolvendo, setDevolvendo] = useState(false);

  const souAluno = usuario.papel === "aluno";
  const souPersonal = usuario.papel === "personal";
  const souCoordenacao = usuario.papel === "coordenacao";
  const meuPapelAssina = souAluno ? "aluno" : souPersonal ? "personal" : null;
  const jaAssinei = ciclo.assinaturas.some((a) => a.signatario === meuPapelAssina);
  const abertoParaAssinar = ciclo.status === "em_andamento" || ciclo.status === "devolvido";
  const pendentes = pendentesDeEnvio(ciclo);
  const ocupado = acoes.estado === "salvando";

  return (
    <Tela titulo={ciclo.titulo} subtitulo={`${dataBr(ciclo.inicio)} a ${dataBr(ciclo.fim)}`} onVoltar={onVoltar}>
      <Linha>
        <Selo texto={ciclo.rotuloStatus} tom={TOM_STATUS[ciclo.status]} />
        <Text style={ui.textoFraco}>
          {pendentes ? `${pendentes} aguardando envio` : "Tudo sincronizado"}
        </Text>
      </Linha>

      {ciclo.devolucoes.length > 0 && ciclo.status === "devolvido" ? (
        <Aviso tipo="erro" texto={`Devolvido: ${ciclo.devolucoes[ciclo.devolucoes.length - 1]!.motivo}`} />
      ) : null}
      {acoes.erro ? <Aviso tipo="erro" texto={acoes.erro} /> : null}
      {acoes.mensagem ? <Aviso tipo="sucesso" texto={acoes.mensagem} /> : null}

      <Cartao>
        <Linha>
          <Text style={ui.textoForte}>Carga horária</Text>
          <Text style={ui.numero}>
            {horas(ciclo.horas.totais)} / {horas(ciclo.horas.minimas)}
          </Text>
        </Linha>
        <BarraProgresso valor={ciclo.horas.progresso} rotulo="Progresso da carga horária" />
        <Text style={ui.textoFraco}>
          {ciclo.horas.cumpriuMinimo
            ? "Mínimo do ciclo cumprido."
            : `Faltam ${horas(ciclo.horas.faltam)} pro mínimo.`}
        </Text>
      </Cartao>

      {/* ações do papel */}
      <View style={styles.acoes}>
        {souAluno && ciclo.editavel ? (
          <Botao titulo="Registrar treino" onPress={onRegistrarTreino} />
        ) : null}
        {(souAluno || souPersonal) && ciclo.editavel ? (
          <Botao
            titulo={souPersonal ? "Avaliar desempenho" : "Fazer autoavaliação"}
            variante="secundario"
            onPress={onAvaliar}
          />
        ) : null}
        {meuPapelAssina && abertoParaAssinar && !jaAssinei ? (
          <Botao
            titulo="Assinar relatório"
            variante={souAluno ? "secundario" : "primario"}
            desabilitado={ciclo.pendenciasParaAssinar.length > 0}
            onPress={onAssinar}
          />
        ) : null}
        {souCoordenacao && ciclo.status === "aguardando_aprovacao" ? (
          <>
            <Botao titulo="Aprovar relatório" carregando={ocupado} onPress={() => void acoes.aprovar()} />
            {devolvendo ? (
              <Cartao>
                <Campo
                  rotulo="Motivo da devolução"
                  value={motivo}
                  onChangeText={setMotivo}
                  multiline
                  placeholder="O que o aluno precisa corrigir?"
                />
                <Botao
                  titulo="Confirmar devolução"
                  variante="perigo"
                  carregando={ocupado}
                  onPress={async () => {
                    if (await acoes.devolver(motivo)) {
                      setDevolvendo(false);
                      setMotivo("");
                    }
                  }}
                />
              </Cartao>
            ) : (
              <Botao titulo="Devolver para correção" variante="perigo" onPress={() => setDevolvendo(true)} />
            )}
          </>
        ) : null}
        {ciclo.status === "aprovado" ? (
          <Botao
            titulo="Gerar PDF"
            desabilitado={!ciclo.pdf.permitido}
            carregando={ocupado}
            onPress={() => void acoes.gerarPdf()}
          />
        ) : null}
        {pendentes > 0 ? (
          <Botao
            titulo="Sincronizar agora"
            variante="secundario"
            carregando={ocupado}
            onPress={() => void acoes.sincronizar()}
          />
        ) : null}
      </View>

      {abertoParaAssinar && ciclo.pendenciasParaAssinar.length > 0 && meuPapelAssina ? (
        <Cartao>
          <Text style={ui.textoForte}>Antes de assinar</Text>
          {ciclo.pendenciasParaAssinar.map((p) => (
            <Text key={p} style={ui.textoFraco}>
              • {p}
            </Text>
          ))}
        </Cartao>
      ) : null}

      {ciclo.status === "aprovado" && !ciclo.pdf.permitido ? (
        <Cartao>
          <Text style={ui.textoForte}>PDF ainda bloqueado</Text>
          {ciclo.pdf.pendencias.map((p) => (
            <Text key={p} style={ui.textoFraco}>
              • {p}
            </Text>
          ))}
        </Cartao>
      ) : null}

      <TituloSecao>Treinos ({ciclo.atividades.length})</TituloSecao>
      {ciclo.atividades.length === 0 ? <Text style={ui.textoFraco}>Nenhum treino registrado.</Text> : null}
      {ciclo.atividades.map((a) => (
        <View key={a.id} style={styles.atividade}>
          <View style={styles.flex}>
            <Text style={ui.texto}>{a.descricao}</Text>
            <Text style={ui.textoFraco}>
              {dataBr(a.data)}
              {a.local ? " · check-in por GPS" : ""} · {ROTULO_SYNC[a.statusSincronizacao]}
            </Text>
          </View>
          <Text style={ui.numero}>{horas(a.horas)}</Text>
        </View>
      ))}

      <TituloSecao>Avaliação do personal</TituloSecao>
      <BlocoAvaliacao avaliacao={ciclo.avaliacaoPersonal} vazio="O personal ainda não avaliou." />

      <TituloSecao>Autoavaliação do aluno</TituloSecao>
      <BlocoAvaliacao avaliacao={ciclo.autoAvaliacao} vazio="O aluno ainda não se avaliou." />

      <TituloSecao>Assinaturas</TituloSecao>
      {(["aluno", "personal"] as const).map((s) => {
        const a = ciclo.assinaturas.find((x) => x.signatario === s);
        return (
          <View key={s} style={styles.assinatura}>
            <Text style={[ui.texto, styles.flex]}>{s === "aluno" ? "Aluno" : "Personal"}</Text>
            {a ? (
              <>
                <View style={styles.rubrica} accessibilityLabel={`Assinatura do ${s}`}>
                  <Rubrica dataUri={a.dataUri} largura={90} altura={36} />
                </View>
                <Text style={ui.textoFraco}>{ROTULO_SYNC[a.statusSincronizacao]}</Text>
              </>
            ) : (
              <Text style={ui.textoFraco}>pendente</Text>
            )}
          </View>
        );
      })}
    </Tela>
  );
}

function BlocoAvaliacao({ avaliacao, vazio }: { avaliacao: AvaliacaoLeitura | null; vazio: string }) {
  if (!avaliacao) return <Text style={ui.textoFraco}>{vazio}</Text>;
  return (
    <Cartao>
      {avaliacao.criterios.map((c) => (
        <Linha key={c.nome}>
          <Text style={[ui.texto, styles.flex]}>{c.nome}</Text>
          <Text style={ui.numero}>{String(c.nota).replace(".", ",")}</Text>
          <Selo texto={c.faixa} tom={c.faixa === "MB" || c.faixa === "B" ? "volt" : c.faixa === "R" ? "ambar" : "coral"} />
        </Linha>
      ))}
      <Linha>
        <Text style={ui.textoFraco}>Média</Text>
        <Text style={styles.media}>{String(avaliacao.media).replace(".", ",")}</Text>
      </Linha>
      {avaliacao.comentario ? <Text style={ui.textoFraco}>“{avaliacao.comentario}”</Text> : null}
      <Text style={ui.textoFraco}>Legenda: MB {DESCRICAO_FAIXA.MB} · B {DESCRICAO_FAIXA.B} · R {DESCRICAO_FAIXA.R} · F {DESCRICAO_FAIXA.F}</Text>
    </Cartao>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  acoes: { gap: spacing.xs },
  atividade: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineBorder,
  },
  assinatura: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6 },
  rubrica: { width: 90, height: 36, backgroundColor: "#ffffff", borderRadius: 6, overflow: "hidden" },
  media: { color: colors.voltLime, fontSize: 16, fontFamily: fontes.mono },
});
