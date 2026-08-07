import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { CloudOff, MapPin, Menu, Navigation } from "lucide-react-native";
import { colors } from "@px/tokens";
import type { GeoPoint, NearbyGym } from "@px/core";
import { Screen } from "@/components/screen";
import { GlassCard } from "@/components/glass-card";
import { PillButton } from "@/components/pill-button";
import { findNearbyGymsUseCase } from "@/lib/gyms";

const RADIUS_METERS = 4000;

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

type SearchState =
  | { status: "locating" }
  | { status: "error" }
  | { status: "ready"; center: GeoPoint; gyms: NearbyGym[] };

/** Academias perto do usuário: Apple/Google Maps + Places API (New). */
export default function AcademiasScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [state, setState] = useState<SearchState>({ status: "locating" });

  const search = useCallback(async () => {
    setState({ status: "locating" });
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const center: GeoPoint = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      const gyms = await findNearbyGymsUseCase.execute({
        center,
        radiusMeters: RADIUS_METERS,
      });
      setState({ status: "ready", center, gyms });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    if (permission?.granted) void search();
  }, [permission?.granted, search]);

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

      {!permission ? null : !permission.granted ? (
        <GlassCard className="items-center py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
            <Navigation size={24} color={colors.fogMuted} />
          </View>
          <Text className="mt-4 font-sans-semibold text-base text-paper">
            Acesso à localização
          </Text>
          <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
            Sua posição é usada só pra encontrar academias num raio de{" "}
            {RADIUS_METERS / 1000} km — nada é gravado nem compartilhado.
          </Text>
          <View className="mt-5 w-full px-6">
            <PillButton onPress={requestPermission}>
              Permitir localização
            </PillButton>
          </View>
        </GlassCard>
      ) : state.status === "locating" ? (
        <View className="items-center py-16">
          <ActivityIndicator color={colors.voltLime} />
          <Text className="mt-3 font-sans text-sm text-fog">
            Procurando academias por perto…
          </Text>
        </View>
      ) : state.status === "error" ? (
        <GlassCard className="items-center py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-glass-strong">
            <CloudOff size={24} color={colors.fogMuted} />
          </View>
          <Text className="mt-4 font-sans-semibold text-base text-paper">
            Não deu pra buscar agora
          </Text>
          <Text className="mt-1 px-6 text-center font-sans text-sm text-fog">
            Confira GPS e internet e tente de novo.
          </Text>
          <View className="mt-5 w-full px-6">
            <PillButton onPress={() => void search()}>
              Tentar de novo
            </PillButton>
          </View>
        </GlassCard>
      ) : (
        <View className="gap-5">
          <View className="h-64 overflow-hidden rounded-px-lg border border-hairline">
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: state.center.latitude,
                longitude: state.center.longitude,
                latitudeDelta: 0.045,
                longitudeDelta: 0.045,
              }}
              showsUserLocation
            >
              {state.gyms.map((gymItem) => (
                <Marker
                  key={gymItem.id}
                  coordinate={{
                    latitude: gymItem.location.latitude,
                    longitude: gymItem.location.longitude,
                  }}
                  title={gymItem.name}
                  description={gymItem.address ?? undefined}
                />
              ))}
            </MapView>
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
