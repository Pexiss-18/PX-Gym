import type { GeoPoint, Gym, NearbyGymsFinder } from "@px/core";
import { fetchComTimeout } from "./fetch-com-timeout";

/*
 * Academias do OpenStreetMap via Overpass API: grátis, sem chave e sem
 * billing. Os servidores tentados vêm no construtor, em ordem, até um
 * responder: o público principal vive lotado ("all query workers are busy",
 * 502), e os espelhos também caem.
 */

export const OVERPASS_PRINCIPAL = "https://overpass-api.de/api/interpreter";
export const OVERPASS_ESPELHOS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/** Por servidor: lotado não pode segurar a tela antes da próxima fonte. */
const TIMEOUT_MS = 8_000;

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

export class OverpassGymFinder implements NearbyGymsFinder {
  constructor(private readonly endpoints: readonly string[]) {}

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

    const failures: string[] = [];
    for (const endpoint of this.endpoints) {
      try {
        return toGyms(await this.ask(endpoint, query));
      } catch (error) {
        failures.push(`${endpoint} ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(`Overpass indisponível: ${failures.join("; ")}`);
  }

  private async ask(endpoint: string, query: string): Promise<OverpassResponse> {
    const response = await fetchComTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // Política de uso do Overpass: cliente identificado (sem isso, 406).
          "User-Agent": "PxGYM/0.1 (app fitness pessoal)",
          Accept: "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
      },
      TIMEOUT_MS,
    );
    if (!response.ok) throw new Error(String(response.status));
    return (await response.json()) as OverpassResponse;
  }
}

function toGyms(data: OverpassResponse): Gym[] {
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

function formatAddress(tags?: Record<string, string>): string | null {
  if (!tags) return null;
  const street = tags["addr:street"];
  if (!street) return null;
  const number = tags["addr:housenumber"];
  return number ? `${street}, ${number}` : street;
}
