import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { CameraView } from "expo-camera";
import type { PermissaoCamera } from "@px/core";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, SwitchCamera, X } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { PillButton } from "@/components/pill-button";
import { useAuth } from "@/adapters/hooks/useAuth";
import { persistCapture, saveProgressPhotoUseCase } from "@/lib/photos";
import { CameraGatewayExpo } from "@/adapters/gateways/CameraGatewayExpo";

/**
 * Captura de foto de progresso. A tela só desenha o preview: permissão e
 * captura passam pelo CameraGateway (expo-camera embrulhado), então a
 * câmera fica atrás da interface do domínio. A foto é gravada no app e no
 * SQLite na hora (pending), com a posição do GPS quando houver permissão —
 * o upload acontece em background quando há rede (a posição não sobe).
 */
export default function CameraScreen() {
  const { sessao } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: larguraTela } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const camera = useMemo(() => new CameraGatewayExpo(() => cameraRef.current), []);
  const [permissao, setPermissao] = useState<PermissaoCamera | null>(null);

  useEffect(() => {
    void camera.permissao().then(setPermissao);
  }, [camera]);

  // Negada de vez: o diálogo não abre mais, só as configurações resolvem.
  const requestPermission = () =>
    permissao === "bloqueada"
      ? void Linking.openSettings()
      : void camera.solicitarPermissao().then(setPermissao);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [saving, setSaving] = useState(false);

  if (!permissao) return <View className="flex-1 bg-black" />;

  if (permissao !== "concedida") {
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
    if (saving || !sessao) return;
    setSaving(true);
    try {
      const foto = await camera.capturar();
      const localUri = persistCapture(foto.uri);
      await saveProgressPhotoUseCase.execute({
        userId: sessao.usuario.id,
        localUri,
        // o disparo é um gesto do usuário: pode pedir a permissão de GPS
        askLocation: true,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-black">
      {/*
        Preview na proporção do sensor (3:4 em pé), pra mostrar a foto
        inteira; as faixas escuras nas laterais são o que o recorte 9:16 tira.
      */}
      <View className="flex-1 justify-center">
        <View style={{ width: larguraTela, height: (larguraTela * 4) / 3 }}>
          <CameraView ref={cameraRef} facing={facing} style={{ flex: 1 }} />
          <View
            pointerEvents="none"
            className="absolute inset-0 flex-row"
          >
            <View className="flex-1 bg-black/60" />
            <View
              className="h-full border border-white/40"
              style={{ aspectRatio: 9 / 16 }}
            />
            <View className="flex-1 bg-black/60" />
          </View>
        </View>
      </View>

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
