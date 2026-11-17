import {
  FindNearbyGymsUseCase,
  type Gym,
  type GeoPoint,
  type NearbyGymsFinder,
} from "@px/core";
import { LocationGatewayExpo } from "@/adapters/gateways/LocationGatewayExpo";
import { NearbyGymsCacheAsyncStorage } from "@/adapters/gateways/NearbyGymsCacheAsyncStorage";
import { FirstAvailableGymFinder } from "@/adapters/gateways/FirstAvailableGymFinder";
import { NominatimGymFinder } from "@/adapters/gateways/NominatimGymFinder";
import {
  OVERPASS_ESPELHOS,
  OVERPASS_PRINCIPAL,
  OverpassGymFinder,
} from "@/adapters/gateways/OverpassGymFinder";
import { systemClock } from "./system";

/*
 * Busca de academias, tudo OpenStreetMap: grátis, sem chave e sem billing.
 * Ordem: Overpass principal (o mais completo), Nominatim (o mais estável) e
 * os espelhos do Overpass. Quando todos caem, a tela mostra a última busca
 * guardada no aparelho. O GooglePlacesGymFinder abaixo fica pronto pra religar
 * se um dia o billing do Google for ativado (basta trocar o finder no useCase
 * lá no fim do arquivo).
 */

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
  new FirstAvailableGymFinder([
    new OverpassGymFinder([OVERPASS_PRINCIPAL]),
    new NominatimGymFinder(),
    new OverpassGymFinder(OVERPASS_ESPELHOS),
  ]),
  new LocationGatewayExpo(),
  { cache: new NearbyGymsCacheAsyncStorage(), clock: systemClock },
);
