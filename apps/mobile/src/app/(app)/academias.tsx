import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { CloudOff, MapPin, Menu, Navigation } from "lucide-react-native";
import { colors } from "@px/tokens";
import type { FindNearbyGymsResult } from "@px/core";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { GymMap } from "@/components/gym-map";
import { PillButton } from "@/components/pill-button";
import { findNearbyGymsUseCase } from "@/lib/gyms";

const RADIUS_METERS = 4000;

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

type ScreenState = { status: "searching" } | FindNearbyGymsResult;

/**
 * Academias perto do usuário. A tela só desenha estados: permissão, GPS (com
 * fallback pra última posição conhecida) e busca no Overpass/OSM ficam no
 * FindNearbyGymsUseCase + ExpoLocationGateway. Mapa Apple Maps no iOS e
 * MapLibre+OSM no Android (GymMap resolve por extensão de plataforma).
 */
export default function AcademiasScreen() {
  const navigation = useNavigation();
  const [state, setState] = useState<ScreenState>({ status: "searching" });

  const search = useCallback(async (askPermission: boolean) => {
    setState({ status: "searching" });
    try {
      setState(
        await findNearbyGymsUseCase.execute({
          radiusMeters: RADIUS_METERS,
          askPermission,
        }),
      );
    } catch {
      // O caso de uso já devolve falha como resultado; isto é a última rede de
      // proteção pra tela nunca ficar presa no "buscando".
      setState({ status: "search-failed" });
    }
  }, []);

  // Abrir a tela só consulta a permissão; o diálogo do sistema espera o toque.
  useEffect(() => {
    void search(false);
  }, [search]);

  // Quem liberou a localização nas configurações do sistema volta pra tela já
  // com a busca rodando.
  useEffect(() => {
    if (state.status !== "needs-permission") return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void search(false);
    });
    return () => sub.remove();
  }, [state.status, search]);

  return (
    <Screen bottomInset={24}>
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="font-sans text-sm text-fog">Por perto</Text>
          <Text className="font-sans-semibold text-3xl text-paper">
            Academias
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-glass-fill"
        >
          <Menu size={18} color={colors.paperForeground} />
        </Pressable>
      </View>

      {state.status === "needs-permission" ? (
        <GlassCard className="items-center py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
            <Navigation size={24} color={colors.fogMuted} />
          </View>
          <Text className="mt-4 font-sans-semibold text-base text-paper">
            Acesso à localização
          </Text>
          <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
            {state.blocked
              ? "A localização está bloqueada pro Px GYM. Libere nas configurações do aparelho e volte aqui."
              : `Sua posição é usada só pra encontrar academias num raio de ${
                  RADIUS_METERS / 1000
                } km — nada é gravado nem compartilhado.`}
          </Text>
          <View className="mt-5 w-full px-6">
            {state.blocked ? (
              <PillButton onPress={() => void Linking.openSettings()}>
                Abrir configurações
              </PillButton>
            ) : (
              <PillButton onPress={() => void search(true)}>
                Permitir localização
              </PillButton>
            )}
          </View>
        </GlassCard>
      ) : state.status === "searching" ? (
        <View className="items-center py-16">
          <ActivityIndicator color={colors.voltLime} />
          <Text className="mt-3 font-sans text-sm text-fog">
            Procurando academias por perto…
          </Text>
        </View>
      ) : state.status === "location-unavailable" ||
        state.status === "search-failed" ? (
        <GlassCard className="items-center py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
            {state.status === "location-unavailable" ? (
              <Navigation size={24} color={colors.fogMuted} />
            ) : (
              <CloudOff size={24} color={colors.fogMuted} />
            )}
          </View>
          <Text className="mt-4 font-sans-semibold text-base text-paper">
            {state.status === "location-unavailable"
              ? "Não achamos sua localização"
              : "Não deu pra buscar agora"}
          </Text>
          <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
            {state.status === "location-unavailable"
              ? "Ligue o GPS e vá pra um lugar mais aberto."
              : "Confira sua internet e tente de novo."}
          </Text>
          <View className="mt-5 w-full px-6">
            <PillButton onPress={() => void search(false)}>
              Tentar de novo
            </PillButton>
          </View>
        </GlassCard>
      ) : (
        <View className="gap-5">
          <View className="h-64 overflow-hidden rounded-px-lg border border-hairline">
            <GymMap center={state.center} gyms={state.gyms} />
          </View>

          {state.gyms.length === 0 ? (
            <GlassCard className="items-center py-8">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
                <MapPin size={24} color={colors.fogMuted} />
              </View>
              <Text className="mt-4 font-sans-semibold text-base text-paper">
                Nenhuma academia no raio de {RADIUS_METERS / 1000} km
              </Text>
            </GlassCard>
          ) : (
            <View className="gap-3">
              {state.gyms.map((gymItem) => (
                <GlassCard key={gymItem.id}>
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-base text-paper">
                        {gymItem.name}
                      </Text>
                      {gymItem.address ? (
                        <Text
                          className="mt-0.5 font-sans text-xs text-fog"
                          numberOfLines={1}
                        >
                          {gymItem.address}
                        </Text>
                      ) : null}
                    </View>
                    <View className="flex-row items-center gap-1">
                      <MapPin size={13} color={colors.voltLime} />
                      <Text className="font-mono text-xs text-volt">
                        {formatDistance(gymItem.distanceMeters)}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              ))}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
