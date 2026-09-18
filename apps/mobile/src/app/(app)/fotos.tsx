import { Pressable, Text, View } from "react-native";
import { router, useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { Image } from "expo-image";
import { Camera, ImageIcon, Menu } from "lucide-react-native";
import { colors } from "@px/tokens";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { PillButton } from "@/components/pill-button";
import { useAuth } from "@/lib/auth-context";
import { useProgressPhotos } from "@/lib/use-local-data";

function formatDay(ms: Date): string {
  return ms.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** Galeria offline-first: as fotos moram no aparelho; o dot mostra o sync. */
export default function FotosScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const photos = useProgressPhotos(session?.user.id ?? "");

  return (
    <Screen bottomInset={24}>
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="font-sans text-sm text-fog">Progresso</Text>
          <Text className="font-sans-semibold text-3xl text-paper">Fotos</Text>
        </View>
        <Pressable
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-glass-fill"
        >
          <Menu size={18} color={colors.paperForeground} />
        </Pressable>
      </View>

      <View className="mb-5">
        <PillButton onPress={() => router.push("/camera")}>
          Tirar foto de hoje
        </PillButton>
      </View>

      {photos.length === 0 ? (
        <GlassCard className="items-center py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
            <ImageIcon size={24} color={colors.fogMuted} />
          </View>
          <Text className="mt-4 font-sans-semibold text-base text-paper">
            Nenhuma foto ainda
          </Text>
          <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
            Registre uma foto por semana no mesmo ângulo — é o jeito mais
            honesto de ver o progresso que a balança esconde.
          </Text>
        </GlassCard>
      ) : (
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {photos.map((photo) => (
            <View key={photo.id} className="w-[31.5%]">
              <View className="aspect-square overflow-hidden rounded-px-md border border-hairline">
                <Image
                  source={{ uri: photo.localUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={150}
                />
                <View
                  className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      photo.syncStatus === "synced"
                        ? colors.voltLime
                        : colors.carbsAmber,
                  }}
                />
              </View>
              <Text className="mt-1 text-center font-sans text-[11px] text-fog">
                {formatDay(photo.takenAt)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {photos.length > 0 ? (
        <View className="mt-5 flex-row items-center justify-center gap-4">
          <View className="flex-row items-center gap-1.5">
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: colors.voltLime }}
            />
            <Text className="font-sans text-[11px] text-fog">na nuvem</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: colors.carbsAmber }}
            />
            <Text className="font-sans text-[11px] text-fog">
              aguardando envio
            </Text>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
