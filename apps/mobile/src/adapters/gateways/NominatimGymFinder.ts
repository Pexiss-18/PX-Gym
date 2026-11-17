import type { GeoPoint, Gym, NearbyGymsFinder } from "@px/core";
import { fetchComTimeout } from "./fetch-com-timeout";

/*
 * Academias pelo Nominatim, a busca oficial do OpenStreetMap: grátis e sem
 * chave, com os mesmos dados do Overpass. Busca por categoria do OSM dentro de
 * um quadrado em volta da posição; o corte exato pelo raio é do caso de uso.
 * Política de uso: cliente identificado e no máximo 1 requisição por segundo,
 * por isso as duas categorias vão uma depois da outra.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 10_000;
/** O Nominatim devolve no máximo 40 por consulta. */
const LIMITE = 40;
const METROS_POR_GRAU = 111_320;

type NominatimPlace = {
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  name?: string;
  address?: { road?: string; house_number?: string };
};

export class NominatimGymFinder implements NearbyGymsFinder {
  async search(center: GeoPoint, radiusMeters: number): Promise<Gym[]> {
    const viewbox = quadrado(center, radiusMeters);
    // leisure=fitness_centre é a tag certa e a mais usada; amenity=gym é a
    // antiga, ainda presente em parte do mapa. Se só ela falhar, fica o resto.
    const principais = await this.ask("[leisure=fitness_centre]", viewbox);
    const antigas = await this.ask("[amenity=gym]", viewbox).catch(() => []);

    const porId = new Map<string, Gym>();
    for (const place of [...principais, ...antigas]) {
      const gym = toGym(place);
      if (!porId.has(gym.id)) porId.set(gym.id, gym);
    }
    return [...porId.values()];
  }

  private async ask(categoria: string, viewbox: string): Promise<NominatimPlace[]> {
    const params = new URLSearchParams({
      q: categoria,
      format: "jsonv2",
      addressdetails: "1",
      limit: String(LIMITE),
      bounded: "1",
      viewbox,
    });
    const response = await fetchComTimeout(
      `${NOMINATIM_URL}?${params}`,
      {
        headers: {
          "User-Agent": "PxGYM/0.1 (app fitness pessoal)",
          Accept: "application/json",
          "Accept-Language": "pt-BR",
        },
      },
      TIMEOUT_MS,
    );
    if (!response.ok) throw new Error(`Nominatim respondeu ${response.status}`);
    return (await response.json()) as NominatimPlace[];
  }
}

/** viewbox do Nominatim: "oeste,norte,leste,sul" cobrindo o raio. */
function quadrado({ latitude, longitude }: GeoPoint, radiusMeters: number): string {
  const dLat = radiusMeters / METROS_POR_GRAU;
  const dLon = radiusMeters / (METROS_POR_GRAU * Math.cos((latitude * Math.PI) / 180));
  return [longitude - dLon, latitude + dLat, longitude + dLon, latitude - dLat].join(",");
}

function toGym(place: NominatimPlace): Gym {
  const street = place.address?.road;
  const number = place.address?.house_number;
  return {
    // Mesmo formato de id do Overpass ("node/123"): a busca guardada não
    // muda de cara quando a fonte troca.
    id: `${place.osm_type}/${place.osm_id}`,
    name: place.name || "Academia",
    address: street ? (number ? `${street}, ${number}` : street) : null,
    location: { latitude: Number(place.lat), longitude: Number(place.lon) },
  };
}
