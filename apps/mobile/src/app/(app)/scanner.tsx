import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScanLine, X } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { PillButton } from "@/components/pill-button";
import { todayWorkout } from "@/lib/mock-data";

/**
 * Leitor de QR dos aparelhos: o QR carrega `pxgym://treino/<exercicioId>`
 * (ou o id puro) e abre a tela do exercício direto — sem procurar na lista.
 */
function parseExerciseId(data: string): string | null {
  const match = /^pxgym:\/\/treino\/(.+)$/.exec(data.trim());
  const id = match ? match[1] : data.trim();
  return todayWorkout.exercises.some((e) => e.id === id) ? id : null;
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [invalid, setInvalid] = useState(false);
  const locked = useRef(false);

  if (!permission) return <View className="flex-1 bg-black" />;

  if (!permission.granted) {
    return (
      <Screen bottomInset={24}>
        <View className="flex-1 justify-center">
          <GlassCard className="items-center py-10">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
              <ScanLine size={24} color={colors.fogMuted} />
            </View>
            <Text className="mt-4 font-sans-semibold text-base text-paper">
              Acesso à câmera
            </Text>
            <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
              Aponte pro QR code do aparelho e o exercício abre direto, sem
              procurar na lista.
            </Text>
            <View className="mt-5 w-full px-6">
              <PillButton onPress={requestPermission}>
                Permitir câmera
              </PillButton>
            </View>
            <Pressable onPress={() => router.back()} className="mt-3 p-2">
              <Text className="font-sans text-sm text-fog">Agora não</Text>
            </Pressable>
          </GlassCard>
        </View>
      </Screen>
    );
  }

  function handleScan(data: string) {
    if (locked.current) return;
    const exercicioId = parseExerciseId(data);
    if (exercicioId) {
      locked.current = true;
      router.replace({
        pathname: "/treino/[exercicioId]",
        params: { exercicioId },
      });
      return;
    }
    // QR de fora do treino: avisa e volta a escanear depois de um instante.
    locked.current = true;
    setInvalid(true);
    setTimeout(() => {
      setInvalid(false);
      locked.current = false;
    }, 1800);
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => handleScan(data)}
      />

      <View
        className="absolute inset-x-0 flex-row items-center justify-between px-5"
        style={{ top: insets.top + 12 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-black/50"
        >
          <X size={18} color="#ffffff" />
        </Pressable>
      </View>

      {/* moldura de mira */}
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
      >
        <View
          className="h-56 w-56 rounded-px-lg border-2"
          style={{
            borderColor: invalid ? colors.alertRed : "rgba(255,255,255,0.8)",
          }}
        />
        <Text className="mt-4 px-10 text-center font-sans text-sm text-white/80">
          {invalid
            ? "Este QR não corresponde a um exercício do treino de hoje."
            : "Aponte pro QR code do aparelho."}
        </Text>
      </View>
    </View>
  );
}
