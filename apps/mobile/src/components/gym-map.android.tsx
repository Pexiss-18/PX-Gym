import { View } from "react-native";
import {
  Camera,
  Map,
  Marker,
  UserLocation,
  type StyleSpecification,
} from "@maplibre/maplibre-react-native";
import { colors } from "@px/tokens";
import type { GeoPoint, NearbyGym } from "@px/core";

/**
 * Mapa das academias — versão Android: MapLibre com tiles raster do
 * OpenStreetMap (mesma fonte da busca Overpass), sem chave e sem billing.
 * A conta Google Cloud do projeto está sem faturamento, então o Google Maps
 * renderizaria um mapa em branco no APK.
 */
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function GymMap({
  center,
  gyms,
}: {
  center: GeoPoint;
  gyms: NearbyGym[];
}) {
  return (
    <Map style={{ flex: 1 }} mapStyle={OSM_STYLE}>
      <Camera
        initialViewState={{
          center: [center.longitude, center.latitude],
          zoom: 13,
        }}
      />
      <UserLocation />
      {gyms.map((gymItem) => (
        <Marker
          key={gymItem.id}
          id={gymItem.id}
          lngLat={[gymItem.location.longitude, gymItem.location.latitude]}
        >
          <View
            style={{
              height: 18,
              width: 18,
              borderRadius: 9,
              backgroundColor: colors.voltLime,
              borderWidth: 3,
              borderColor: colors.inkSurface,
            }}
          />
        </Marker>
      ))}
    </Map>
  );
}
