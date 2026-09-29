import { Text, View } from "react-native";
import type { StyleSpecification } from "@maplibre/maplibre-react-native";
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

/*
 * O MapLibre é módulo nativo: existe no APK, não no Expo Go. Importado no
 * topo, derrubava o app INTEIRO no Expo Go Android (o Expo Router carrega
 * todas as rotas). Carregado sob demanda, só a área do mapa degrada — a
 * lista de academias continua funcionando.
 */
type MapLibre = typeof import("@maplibre/maplibre-react-native");
let maplibre: MapLibre | null | undefined;
function carregarMapLibre(): MapLibre | null {
  if (maplibre === undefined) {
    try {
      maplibre = require("@maplibre/maplibre-react-native") as MapLibre;
    } catch {
      maplibre = null;
    }
  }
  return maplibre;
}

export function GymMap({
  center,
  gyms,
}: {
  center: GeoPoint;
  gyms: NearbyGym[];
}) {
  const ml = carregarMapLibre();
  if (!ml) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ color: colors.fogMuted, textAlign: "center" }}>
          Mapa disponível só no app instalado (APK). A lista abaixo funciona normalmente.
        </Text>
      </View>
    );
  }
  const { Camera, Map, Marker, UserLocation } = ml;
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
