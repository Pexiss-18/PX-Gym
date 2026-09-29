import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LocationGateway, NovaAtividade } from "@px/core";
import { colors, spacing } from "@px/tokens";
import { useAtividades } from "../hooks/useAtividades";
import { dataBr, hojeIso, horas as fmtHoras, lerHoras } from "./formato";
import { Aviso, Botao, Campo, Cartao, Linha, Tela, TituloSecao, styles as ui } from "./ui";

type Local = NonNullable<NovaAtividade["local"]>;

/**
 * Formulário de treinos do ciclo. Monta um lote (um ou mais treinos) e
 * manda de uma vez pro RegistrarAtividadesUseCase via useAtividades. O GPS
 * entra pelo LocationGateway injetado — no teste, um fake.
 */
export function AtividadesFormScreen({
  cicloId,
  localizacao,
  onVoltar,
  hoje = hojeIso(),
}: {
  cicloId: string;
  localizacao: LocationGateway;
  onVoltar: () => void;
  hoje?: string;
}) {
  const { estado, erro, registrar, resetar } = useAtividades(cicloId);
  const [data, setData] = useState(hoje);
  const [descricao, setDescricao] = useState("");
  const [horasTexto, setHorasTexto] = useState("");
  const [local, setLocal] = useState<Local | null>(null);
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [lote, setLote] = useState<NovaAtividade[]>([]);

  async function marcarLocal() {
    setBuscandoGps(true);
    setErroForm(null);
    try {
      let permissao = await localizacao.permission();
      if (permissao === "undetermined" || permissao === "denied") {
        permissao = await localizacao.requestPermission();
      }
      if (permissao !== "granted") {
        setErroForm("Sem permissão de localização — o treino pode ser salvo sem check-in.");
        return;
      }
      const p = await localizacao.currentPosition();
      setLocal({ latitude: p.latitude, longitude: p.longitude, timestamp: new Date(p.timestamp ?? Date.now()) });
    } catch {
      setErroForm("Não deu pra pegar sua posição agora.");
    } finally {
      setBuscandoGps(false);
    }
  }

  function adicionar() {
    const horas = lerHoras(horasTexto);
    // Checagem de formulário (campo vazio / não-número). As REGRAS
    // (data no ciclo, teto de horas…) são do domínio e voltam como erro.
    if (!descricao.trim() || Number.isNaN(horas)) {
      setErroForm("Preencha descrição e horas (ex.: 1,5).");
      return;
    }
    setErroForm(null);
    resetar();
    setLote((l) => [...l, { data: data.trim(), descricao, horas, local }]);
    setDescricao("");
    setHorasTexto("");
    setLocal(null);
  }

  async function salvar() {
    if (await registrar(lote)) setLote([]);
  }

  return (
    <Tela titulo="Registrar treinos" subtitulo="Monte a lista e salve de uma vez." onVoltar={onVoltar}>
      <Cartao>
        <Campo rotulo="Data (AAAA-MM-DD)" value={data} onChangeText={setData} autoCapitalize="none" />
        <Campo
          rotulo="O que você treinou"
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Treino A — peito e tríceps"
        />
        <Campo
          rotulo="Duração em horas"
          value={horasTexto}
          onChangeText={setHorasTexto}
          keyboardType="decimal-pad"
          placeholder="1,5"
        />
        <Pressable
          onPress={() => void marcarLocal()}
          accessibilityRole="button"
          accessibilityLabel="Marcar check-in por GPS"
          style={styles.gps}
        >
          <Text style={local ? styles.gpsAtivo : ui.textoFraco}>
            {buscandoGps
              ? "Buscando sua posição…"
              : local
                ? `Check-in: ${local.latitude.toFixed(4)}, ${local.longitude.toFixed(4)}`
                : "+ Marcar check-in por GPS (opcional)"}
          </Text>
        </Pressable>
        {erroForm ? <Aviso tipo="erro" texto={erroForm} /> : null}
        <Botao titulo="Adicionar à lista" variante="secundario" onPress={adicionar} />
      </Cartao>

      <TituloSecao>Para salvar ({lote.length})</TituloSecao>
      {lote.length === 0 ? <Text style={ui.textoFraco}>Nenhum treino na lista ainda.</Text> : null}
      {lote.map((a, i) => (
        <View key={`${a.data}-${i}`} style={styles.item}>
          <View style={styles.flex}>
            <Text style={ui.texto}>{a.descricao}</Text>
            <Text style={ui.textoFraco}>
              {dataBr(a.data)}
              {a.local ? " · com check-in" : ""}
            </Text>
          </View>
          <Text style={ui.numero}>{fmtHoras(a.horas)}</Text>
          <Pressable
            onPress={() => setLote((l) => l.filter((_, j) => j !== i))}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${a.descricao}`}
            hitSlop={8}
          >
            <Text style={styles.remover}>×</Text>
          </Pressable>
        </View>
      ))}

      {estado === "erro" && erro ? <Aviso tipo="erro" texto={erro} /> : null}
      {estado === "salvo" ? <Aviso tipo="sucesso" texto="Treinos salvos no relatório." /> : null}

      <Linha>
        <View style={styles.flex}>
          <Botao
            titulo={
              lote.length === 0
                ? "Salvar treinos"
                : `Salvar ${lote.length} ${lote.length === 1 ? "treino" : "treinos"}`
            }
            carregando={estado === "salvando"}
            desabilitado={lote.length === 0}
            onPress={() => void salvar()}
          />
        </View>
      </Linha>
    </Tela>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gps: { paddingVertical: spacing.xs },
  gpsAtivo: { color: colors.voltLime, fontSize: 13 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineBorder,
  },
  remover: { color: colors.fogMuted, fontSize: 22, paddingHorizontal: 4 },
});
