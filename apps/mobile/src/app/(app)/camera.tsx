import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, SwitchCamera, X } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { PillButton } from "@/components/pill-button";
import { useAuth } from "@/lib/auth-context";
import { persistCapture, saveProgressPhotoUseCase } from "@/lib/photos";

/**
 * Captura de foto de progresso. A foto é gravada no app e no SQLite na hora
 * (pending) — o upload pro bucket acontece em background quando há rede.
 */
export default function CameraScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [saving, setSaving] = useState(false);

  if (!permission) return <View className="flex-1 bg-black" />;

  if (!permission.granted) {
    return (
      <Screen bottomInset={24}>
        <View className="flex-1 justify-center">
          <GlassCard className="items-center py-10">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
              <Camera size={24} color={colors.fogMuted} />
            </View>
            <Text className="mt-4 font-sans-semibold text-base text-paper">
              Acesso à câmera
            </Text>
            <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
              O Px GYM usa a câmera pra registrar suas fotos de progresso. Nada
              é publicado — as fotos ficam no seu aparelho e no seu espaço
              privado da nuvem.
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

  async function capture() {
    if (saving || !session) return;
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
    if (!photo) return;
    setSaving(true);
    try {
      const localUri = persistCapture(photo.uri);
      await saveProgressPhotoUseCase.execute({
        userId: session.user.id,
        localUri,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} facing={facing} style={{ flex: 1 }} />

      {/* controles sobre o preview */}
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
        <Pressable
          onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          className="h-10 w-10 items-center justify-center rounded-full bg-black/50"
        >
          <SwitchCamera size={18} color="#ffffff" />
        </Pressable>
      </View>

      <View
        className="absolute inset-x-0 items-center"
        style={{ bottom: insets.bottom + 32 }}
      >
        <Pressable
          onPress={capture}
          disabled={saving}
          className="h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/90 active:scale-[0.93]"
        >
          {saving ? (
            <ActivityIndicator color={colors.voltLime} />
          ) : (
            <View
              className="h-14 w-14 rounded-full"
              style={{ backgroundColor: colors.voltLime }}
            />
          )}
        </Pressable>
        <Text className="mt-3 font-sans text-xs text-white/80">
          Mesma pose, mesma luz — compare de verdade.
        </Text>
      </View>
    </View>
  );
}
