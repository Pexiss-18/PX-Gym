import {
  FindNearbyGymsUseCase,
  type Gym,
  type GeoPoint,
  type NearbyGymsFinder,
} from "@px/core";

/*
 * Busca de academias via Google Places API (New). A chave fica em
 * EXPO_PUBLIC_GOOGLE_MAPS_KEY (apps/mobile/.env) restrita às APIs de
 * Places/Maps no console do Google.
 */

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

/** A UI usa isso pra mostrar o estado "chave ainda não configurada". */
export const hasPlacesKey = Boolean(PLACES_KEY);

type PlacesNearbyResponse = {
  places?: {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
  }[];
};

class GooglePlacesGymFinder implements NearbyGymsFinder {
  async search(center: GeoPoint, radiusMeters: number): Promise<Gym[]> {
    if (!PLACES_KEY) {
      throw new Error("EXPO_PUBLIC_GOOGLE_MAPS_KEY não configurada");
    }

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": PLACES_KEY,
          // FieldMask mínima = resposta menor e SKU mais barato.
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          includedTypes: ["gym"],
          maxResultCount: 20,
          languageCode: "pt-BR",
          locationRestriction: {
            circle: {
              center: {
                latitude: center.latitude,
                longitude: center.longitude,
              },
              radius: radiusMeters,
            },
          },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Places respondeu ${response.status}`);
    }

    const data = (await response.json()) as PlacesNearbyResponse;
    return (data.places ?? [])
      .filter((p) => p.location)
      .map((p) => ({
        id: p.id,
        name: p.displayName?.text ?? "Academia",
        address: p.formattedAddress ?? null,
        location: {
          latitude: p.location!.latitude,
          longitude: p.location!.longitude,
        },
      }));
  }
}

export const findNearbyGymsUseCase = new FindNearbyGymsUseCase(
  new GooglePlacesGymFinder(),
);
