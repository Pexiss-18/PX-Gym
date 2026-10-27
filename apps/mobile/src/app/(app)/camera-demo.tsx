import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SwitchCamera, User, X } from "lucide-react-native";
import { colors } from "@px/tokens";
import { tirarFotoMock } from "@/lib/fotos-mock";

/**
 * Câmera do modo mock: mesma cara da tela de captura, mas o "preview" é
 * desenhado e o disparo grava uma foto de demonstração na galeria em
 * memória. Não usa expo-camera nem pede permissão.
 */
export default function CameraDemoScreen() {
  const insets = useSafeAreaInsets();
  const [frontal, setFrontal] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function capturar() {
    if (salvando) return;
    setSalvando(true);
    setTimeout(() => {
      tirarFotoMock();
      router.back();
    }, 400);
  }

  return (
    <View style={styles.tela}>
      <View style={styles.preview}>
        <View style={[styles.moldura, frontal && styles.molduraFrontal]}>
          <User size={140} color={colors.fogMuted} strokeWidth={1.2} />
        </View>
        <Text style={styles.selo}>CÂMERA SIMULADA · MODO MOCK</Text>
      </View>

      <View style={[styles.topo, { top: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.botaoRedondo} accessibilityLabel="Fechar câmera">
          <X size={18} color="#ffffff" />
        </Pressable>
        <Pressable onPress={() => setFrontal((f) => !f)} style={styles.botaoRedondo} accessibilityLabel="Trocar câmera">
          <SwitchCamera size={18} color="#ffffff" />
        </Pressable>
      </View>

      <View style={[styles.rodape, { bottom: insets.bottom + 32 }]}>
        <Pressable onPress={capturar} disabled={salvando} style={styles.disparo} accessibilityLabel="Tirar foto">
          {salvando ? <ActivityIndicator color={colors.voltLime} /> : <View style={styles.miolo} />}
        </Pressable>
        <Text style={styles.dica}>Mesma pose, mesma luz — compare de verdade.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#000000" },
  preview: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1b1e24" },
  moldura: {
    width: 240,
    height: 320,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "#262a32",
  },
  molduraFrontal: { backgroundColor: "#2f3440" },
  selo: { marginTop: 16, color: colors.voltLime, fontSize: 11, letterSpacing: 1.5 },
  topo: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  botaoRedondo: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  rodape: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  disparo: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.9)",
  },
  miolo: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.voltLime },
  dica: { marginTop: 12, color: "rgba(255,255,255,0.8)", fontSize: 12 },
});
