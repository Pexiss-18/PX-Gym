import MapView, { Marker } from "react-native-maps";
import type { GeoPoint, NearbyGym } from "@px/core";

/**
 * Mapa das academias — versão iOS/default: react-native-maps renderiza o
 * Apple Maps nativo, sem chave nenhuma. O Android usa gym-map.android.tsx
 * (MapLibre + OSM), porque o Google Maps exige billing ativo pra renderizar.
 */
export function GymMap({
  center,
  gyms,
}: {
  center: GeoPoint;
  gyms: NearbyGym[];
}) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      }}
      showsUserLocation
    >
      {gyms.map((gymItem) => (
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
  );
}
