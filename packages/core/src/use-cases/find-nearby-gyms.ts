import type { Gym, NearbyGym } from "../entities/gym";
import type { GeoPoint } from "../value-objects/geo";
import { haversineMeters } from "../value-objects/geo";
import type {
  LocationGateway,
  LocationPermission,
  NearbyGymsFinder,
} from "../ports";

export type FindNearbyGymsInput = {
  radiusMeters: number;
  /**
   * true quando a busca nasce de um gesto do usuário ("Permitir
   * localização"): aí, e só aí, o diálogo de permissão pode abrir.
   */
  askPermission?: boolean;
};

export type FindNearbyGymsResult =
  | { status: "needs-permission"; blocked: boolean }
  | { status: "location-unavailable" }
  | { status: "search-failed" }
  | { status: "found"; center: GeoPoint; gyms: NearbyGym[] };

/**
 * Busca academias perto do usuário: confere a permissão de localização, lê a
 * posição pelo gateway do GPS, pede candidatas ao finder (OSM/Places) e aplica
 * o que é regra nossa — distância real, corte pelo raio e ordenação da mais
 * perto pra mais longe. Cada falha volta como um resultado distinto porque a
 * tela reage diferente a cada uma.
 */
export class FindNearbyGymsUseCase {
  constructor(
    private readonly finder: NearbyGymsFinder,
    private readonly location: LocationGateway,
  ) {}

  async execute(input: FindNearbyGymsInput): Promise<FindNearbyGymsResult> {
    // O próprio módulo de localização pode falhar (serviço desligado, erro do
    // SDK). Nada aqui pode escapar: a tela ficaria presa no "buscando".
    let permission: LocationPermission;
    try {
      permission = await this.location.permission();
      if (permission !== "granted" && input.askPermission) {
        permission = await this.location.requestPermission();
      }
    } catch {
      return { status: "location-unavailable" };
    }
    if (permission !== "granted") {
      return { status: "needs-permission", blocked: permission === "blocked" };
    }

    let center: GeoPoint;
    try {
      center = await this.location.currentPosition();
    } catch {
      return { status: "location-unavailable" };
    }

    let found: Gym[];
    try {
      found = await this.finder.search(center, input.radiusMeters);
    } catch {
      return { status: "search-failed" };
    }

    return {
      status: "found",
      center,
      gyms: rankByDistance(center, found, input.radiusMeters),
    };
  }
}

function rankByDistance(
  center: GeoPoint,
  gyms: Gym[],
  radiusMeters: number,
): NearbyGym[] {
  return gyms
    .map((gym) => ({
      ...gym,
      distanceMeters: Math.round(haversineMeters(center, gym.location)),
    }))
    .filter((gym) => gym.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
