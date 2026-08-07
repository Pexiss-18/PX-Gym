import {
  FindNearbyGymsUseCase,
  type Gym,
  type GeoPoint,
  type NearbyGymsFinder,
} from "@px/core";

/*
 * Busca de academias. Fonte ativa: OpenStreetMap via Overpass API — grátis,
 * sem chave e sem billing. O GooglePlacesGymFinder abaixo fica pronto pra
 * religar se um dia o billing do Google for ativado (basta trocar o finder
 * no useCase lá no fim do arquivo).
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

type OverpassResponse = {
  elements?: {
    type: "node" | "way" | "relation";
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }[];
};

class OverpassGymFinder implements NearbyGymsFinder {
  async search(center: GeoPoint, radiusMeters: number): Promise<Gym[]> {
    const around = `(around:${radiusMeters},${center.latitude},${center.longitude})`;
    const query = `
      [out:json][timeout:15];
      (
        nwr["leisure"="fitness_centre"]${around};
        nwr["amenity"="gym"]${around};
      );
      out center 40;
    `;

    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Política de uso do Overpass: cliente identificado (sem isso, 406).
        "User-Agent": "PxGYM/0.1 (app fitness pessoal)",
        Accept: "application/json",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) {
      throw new Error(`Overpass respondeu ${response.status}`);
    }

    const data = (await response.json()) as OverpassResponse;
    return (data.elements ?? [])
      .map((el) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (lat === undefined || lon === undefined) return null;
        return {
          id: `${el.type}/${el.id}`,
          name: el.tags?.name ?? "Academia",
          address: formatAddress(el.tags),
          location: { latitude: lat, longitude: lon },
        };
      })
      .filter((gym): gym is Gym => gym !== null);
  }
}

function formatAddress(tags?: Record<string, string>): string | null {
  if (!tags) return null;
  const street = tags["addr:street"];
  if (!street) return null;
  const number = tags["addr:housenumber"];
  return number ? `${street}, ${number}` : street;
}

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

type PlacesNearbyResponse = {
  places?: {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
  }[];
};

/** Alternativa paga (dados mais ricos): exige billing ativo no Google Cloud. */
export class GooglePlacesGymFinder implements NearbyGymsFinder {
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
  new OverpassGymFinder(),
);
