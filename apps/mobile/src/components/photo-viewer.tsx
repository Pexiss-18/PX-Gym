import { useEffect, useState } from "react";
import {
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Map as MapIcon, MapPin, Trash2, User, X } from "lucide-react-native";
import type { PhotoLocation } from "@px/core";
import { colors } from "@px/tokens";

export type ViewerPhoto = {
  id: string;
  localUri?: string;
  demo?: boolean;
  takenAt: Date;
  syncStatus: string;
  location?: PhotoLocation | null;
};

function formatLongDay(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

/** "19,9245° S · 43,9352° O": 4 casas ≈ 11 m, o bastante pra reconhecer o lugar. */
function formatCoords({ latitude, longitude }: PhotoLocation): string {
  const grau = (v: number) => `${Math.abs(v).toFixed(4).replace(".", ",")}°`;
  return `${grau(latitude)} ${latitude < 0 ? "S" : "N"} · ${grau(longitude)} ${longitude < 0 ? "O" : "L"}`;
}

/**
 * Abre o app de mapas no ponto, só com o toque da pessoa. Sem geocodificação
 * reversa: ela mandaria a posição pros servidores da Apple/Google, e a
 * posição da foto fica só no aparelho.
 */
function openInMaps({ latitude, longitude }: PhotoLocation) {
  const ponto = `${latitude},${longitude}`;
  const url =
    Platform.OS === "android"
      ? `geo:${ponto}?q=${ponto}(Foto de progresso)`
      : `https://maps.apple.com/?ll=${ponto}&q=Foto%20de%20progresso`;
  void Linking.openURL(url);
}

/**
 * Foto de progresso em tela cheia, inteira (contain: o 9:16 não é cortado).
 * Desliza pros lados pra comparar com as outras, na mesma ordem da galeria.
 * `index` null = fechado.
 */
export function PhotoViewer({
  photos,
  index,
  onClose,
  onDelete,
}: {
  photos: ViewerPhoto[];
  index: number | null;
  onClose: () => void;
  onDelete: (photo: ViewerPhoto) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);

  // A galeria muda por baixo (foto apagada): o índice nunca passa do fim.
  const last = Math.max(photos.length - 1, 0);
  const start = Math.min(index ?? 0, last);
  useEffect(() => setCurrent(start), [start]);

  if (index === null || photos.length === 0) return null;
  const shown = Math.min(current, last);
  const photo = photos[shown]!;

  const onPageChange = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    setCurrent(Math.round(contentOffset.x / layoutMeasurement.width));
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1" style={{ backgroundColor: "#000" }}>
        <FlatList
          testID="fotos-paginas"
          data={photos}
          keyExtractor={(p) => p.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onPageChange}
          renderItem={({ item }) => (
            <View style={{ width, height }} className="items-center justify-center">
              {item.demo ? (
                <User size={96} color={colors.fogMuted} strokeWidth={1.2} />
              ) : (
                <Image
                  source={{ uri: item.localUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="contain"
                  transition={150}
                />
              )}
            </View>
          )}
        />

        <View
          className="absolute inset-x-0 top-0 flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar foto"
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-glass-fill"
          >
            <X size={18} color={colors.paperForeground} />
          </Pressable>
          <View className="items-end">
            <Text className="font-sans-semibold text-base text-paper">
              {formatLongDay(photo.takenAt)}
            </Text>
            <Text className="font-mono text-xs text-fog">
              {shown + 1} de {photos.length}
            </Text>
          </View>
        </View>

        <View
          className="absolute inset-x-0 bottom-0 gap-4 px-5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Vidro com blur real: o card fica por cima da foto e precisa ler em qualquer fundo. */}
          <View className="overflow-hidden rounded-px-lg border border-hairline">
            <BlurView
              intensity={40}
              tint="dark"
              blurMethod="dimezisBlurView"
              style={{ backgroundColor: "rgba(10, 11, 14, 0.55)" }}
            >
              <View className="flex-row items-center gap-3 px-4 py-3">
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <MapPin
                      size={12}
                      color={photo.location ? colors.voltLime : colors.fogMuted}
                    />
                    <Text className="font-sans text-[11px] text-fog">
                      {photo.location ? "Onde foi tirada" : "Sem localização"}
                    </Text>
                  </View>
                  <Text
                    className="mt-1 font-mono text-[13px] text-paper"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {photo.location
                      ? formatCoords(photo.location)
                      : "Sem permissão ou sem sinal do GPS"}
                  </Text>
                </View>
                {photo.location ? (
                  <Pressable
                    onPress={() => openInMaps(photo.location!)}
                    accessibilityRole="button"
                    accessibilityLabel="Ver no mapa onde a foto foi tirada"
                    hitSlop={6}
                    className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2 active:scale-[0.98]"
                    style={{
                      backgroundColor: "rgba(176, 236, 0, 0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(176, 236, 0, 0.35)",
                    }}
                  >
                    <MapIcon size={14} color={colors.voltLime} />
                    <Text className="font-sans-semibold text-xs text-volt">Ver no mapa</Text>
                  </Pressable>
                ) : null}
              </View>
            </BlurView>
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    photo.syncStatus === "synced" ? colors.voltLime : colors.carbsAmber,
                }}
              />
              <Text className="font-sans text-xs text-fog">
                {photo.syncStatus === "synced" ? "Na nuvem" : "Aguardando envio"}
              </Text>
            </View>
            <Pressable
              onPress={() => onDelete(photo)}
              accessibilityRole="button"
              accessibilityLabel="Apagar foto"
              hitSlop={8}
              className="flex-row items-center gap-2 rounded-full border border-hairline bg-glass-fill px-4 py-2.5"
            >
              <Trash2 size={15} color={colors.proteinCoral} />
              <Text className="font-sans-semibold text-xs text-paper">Apagar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
