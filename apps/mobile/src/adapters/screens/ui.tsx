import { useContext, useState, type PropsWithChildren, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { colors, glass, radius, spacing } from "@px/tokens";

/*
 * Kit visual das telas do relatório: só <View>/<Text> nativos, estilo em
 * StyleSheet.create e layout em Flexbox (eixo principal = column, o padrão
 * do React Native). Cores, raios e espaçamentos vêm dos tokens do DESIGN.md.
 */

export const fontes = {
  regular: "Geist_400Regular",
  medio: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  mono: "GeistMono_600SemiBold",
} as const;

export function Tela({
  titulo,
  subtitulo,
  onVoltar,
  acaoTopo,
  children,
}: PropsWithChildren<{
  titulo: string;
  subtitulo?: string;
  onVoltar?: () => void;
  acaoTopo?: ReactNode;
}>) {
  // Sem SafeAreaProvider (testes) cai pra zero em vez de quebrar.
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  return (
    <View style={styles.tela}>
      <ScrollView
        contentContainerStyle={[
          styles.conteudo,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topo}>
          {onVoltar ? (
            <Pressable
              onPress={onVoltar}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              hitSlop={8}
              style={styles.voltar}
            >
              <Text style={styles.voltarTexto}>‹</Text>
            </Pressable>
          ) : null}
          <View style={styles.topoTextos}>
            <Text style={styles.titulo} accessibilityRole="header">
              {titulo}
            </Text>
            {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
          </View>
          {acaoTopo}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

export function Cartao({ children, destaque = false }: PropsWithChildren<{ destaque?: boolean }>) {
  return <View style={[styles.cartao, destaque && styles.cartaoDestaque]}>{children}</View>;
}

export function TituloSecao({ children }: PropsWithChildren) {
  return <Text style={styles.tituloSecao}>{children}</Text>;
}

export function Botao({
  titulo,
  onPress,
  variante = "primario",
  carregando = false,
  desabilitado = false,
}: {
  titulo: string;
  onPress: () => void;
  variante?: "primario" | "secundario" | "perigo";
  carregando?: boolean;
  desabilitado?: boolean;
}) {
  const inativo = desabilitado || carregando;
  // Estilo em array, não em função: o NativeWind do app descarta o
  // style={({ pressed }) => ...} do Pressable e o botão ficava sem fundo.
  const [pressionado, setPressionado] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressionado(true)}
      onPressOut={() => setPressionado(false)}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      style={[
        styles.botao,
        variante === "primario" && styles.botaoPrimario,
        variante === "secundario" && styles.botaoSecundario,
        variante === "perigo" && styles.botaoPerigo,
        inativo && styles.inativo,
        pressionado && styles.pressionado,
      ]}
    >
      {carregando ? (
        <ActivityIndicator
          size="small"
          color={variante === "primario" ? colors.inkSurface : colors.paperForeground}
        />
      ) : null}
      <Text
        style={[styles.botaoTexto, variante === "primario" ? styles.textoSobreVolt : styles.textoClaro]}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}

export function Campo({ rotulo, ...props }: TextInputProps & { rotulo: string }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor={colors.fogMuted}
        style={[styles.input, props.multiline && styles.inputMultilinha]}
        {...props}
      />
    </View>
  );
}

const TONS = {
  neutro: { fundo: glass.track, texto: colors.fogMuted },
  volt: { fundo: "rgba(176,236,0,0.14)", texto: colors.voltLime },
  ambar: { fundo: "rgba(249,183,63,0.14)", texto: colors.carbsAmber },
  coral: { fundo: "rgba(253,118,93,0.14)", texto: colors.proteinCoral },
} as const;
export type Tom = keyof typeof TONS;

export function Selo({ texto, tom = "neutro" }: { texto: string; tom?: Tom }) {
  return (
    <View style={[styles.selo, { backgroundColor: TONS[tom].fundo }]}>
      <Text style={[styles.seloTexto, { color: TONS[tom].texto }]}>{texto}</Text>
    </View>
  );
}

export function Aviso({ tipo, texto }: { tipo: "erro" | "sucesso" | "info"; texto: string }) {
  return (
    <View
      accessibilityRole={tipo === "erro" ? "alert" : "text"}
      style={[
        styles.aviso,
        tipo === "erro" && styles.avisoErro,
        tipo === "sucesso" && styles.avisoSucesso,
      ]}
    >
      <Text style={[styles.avisoTexto, tipo === "erro" && { color: colors.proteinCoral }, tipo === "sucesso" && { color: colors.voltLime }]}>
        {texto}
      </Text>
    </View>
  );
}

export function BarraProgresso({ valor, rotulo }: { valor: number; rotulo: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, valor)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={rotulo}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={styles.trilha}
    >
      <View style={[styles.preenchimento, { width: `${pct}%` }]} />
    </View>
  );
}

export function Linha({ children }: PropsWithChildren) {
  return <View style={styles.linha}>{children}</View>;
}

export function Carregando() {
  return (
    <View style={styles.centro}>
      <ActivityIndicator color={colors.voltLime} />
    </View>
  );
}

export const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.inkGround },
  conteudo: { paddingHorizontal: spacing.md, gap: spacing.sm },
  topo: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  topoTextos: { flex: 1 },
  voltar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairlineBorder,
    backgroundColor: glass.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  voltarTexto: { color: colors.paperForeground, fontSize: 24, lineHeight: 26, fontFamily: fontes.medio },
  titulo: { color: colors.paperForeground, fontSize: 22, fontFamily: fontes.semibold },
  subtitulo: { color: colors.fogMuted, fontSize: 13, fontFamily: fontes.regular, marginTop: 2 },
  cartao: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairlineBorder,
    backgroundColor: glass.fill,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cartaoDestaque: { borderColor: "rgba(176,236,0,0.35)" },
  tituloSecao: {
    color: colors.fogMuted,
    fontSize: 12,
    fontFamily: fontes.medio,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.xs,
  },
  botao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  botaoPrimario: { backgroundColor: colors.voltLime },
  botaoSecundario: { borderWidth: 1, borderColor: colors.hairlineBorder, backgroundColor: glass.fill },
  botaoPerigo: { borderWidth: 1, borderColor: "rgba(249,65,68,0.5)", backgroundColor: "rgba(249,65,68,0.08)" },
  inativo: { opacity: 0.5 },
  pressionado: { transform: [{ scale: 0.98 }] },
  botaoTexto: { fontSize: 14, fontFamily: fontes.semibold },
  textoSobreVolt: { color: colors.inkSurface },
  textoClaro: { color: colors.paperForeground },
  campo: { gap: 6 },
  rotulo: { color: colors.fogMuted, fontSize: 12, fontFamily: fontes.medio },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairlineBorder,
    backgroundColor: glass.fill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.paperForeground,
    fontSize: 14,
    fontFamily: fontes.regular,
  },
  inputMultilinha: { minHeight: 88, textAlignVertical: "top" },
  selo: { alignSelf: "flex-start", borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  seloTexto: { fontSize: 11, fontFamily: fontes.semibold },
  aviso: { borderRadius: radius.md, padding: spacing.sm, backgroundColor: glass.track },
  avisoErro: { backgroundColor: "rgba(253,118,93,0.10)" },
  avisoSucesso: { backgroundColor: "rgba(176,236,0,0.10)" },
  avisoTexto: { color: colors.paperForeground, fontSize: 13, fontFamily: fontes.regular },
  trilha: { height: 8, borderRadius: radius.full, backgroundColor: glass.track, overflow: "hidden" },
  preenchimento: { height: 8, borderRadius: radius.full, backgroundColor: colors.voltLime },
  linha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xl },
  texto: { color: colors.paperForeground, fontSize: 14, fontFamily: fontes.regular },
  textoFraco: { color: colors.fogMuted, fontSize: 13, fontFamily: fontes.regular },
  textoForte: { color: colors.paperForeground, fontSize: 15, fontFamily: fontes.semibold },
  numero: { color: colors.paperForeground, fontSize: 15, fontFamily: fontes.mono },
});
