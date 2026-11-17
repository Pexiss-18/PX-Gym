import type { Gym, NearbyGym } from "../../domain/entities/gym";
import type { GeoPoint } from "../../domain/value-objects/geo";
import { haversineMeters } from "../../domain/value-objects/geo";
import type {
  Clock,
  LocationGateway,
  LocationPermission,
  NearbyGymsCache,
  NearbyGymsFinder,
} from "../../domain/contracts";

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
  | {
      status: "found";
      center: GeoPoint;
      gyms: NearbyGym[];
      /** Presente quando o finder caiu e a lista veio da última busca guardada. */
      cachedAt?: Date;
    };

/** Última busca guardada no aparelho, usada quando o finder cai. */
export type NearbyGymsFallback = {
  cache: NearbyGymsCache;
  clock: Clock;
};

/**
 * Busca academias perto do usuário: confere a permissão de localização, lê a
 * posição pelo gateway do GPS, pede candidatas ao finder (OSM/Places) e aplica
 * o que é regra nossa — distância real, corte pelo raio e ordenação da mais
 * perto pra mais longe. Cada falha volta como um resultado distinto porque a
 * tela reage diferente a cada uma. Com um fallback, a busca que deu certo é
 * guardada, e se o finder cair a última busca é recalculada a partir da
 * posição atual.
 */
export class FindNearbyGymsUseCase {
  constructor(
    private readonly finder: NearbyGymsFinder,
    private readonly location: LocationGateway,
    private readonly fallback?: NearbyGymsFallback,
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
      return this.fromLastSearch(center, input.radiusMeters);
    }

    await this.remember(center, found);
    return {
      status: "found",
      center,
      gyms: rankByDistance(center, found, input.radiusMeters),
    };
  }

  private async remember(center: GeoPoint, gyms: Gym[]): Promise<void> {
    if (!this.fallback) return;
    try {
      await this.fallback.cache.save({
        center,
        gyms,
        savedAt: this.fallback.clock.now(),
      });
    } catch {
      // Guardar é bônus: a busca nova já deu certo e vai pra tela.
    }
  }

  private async fromLastSearch(
    center: GeoPoint,
    radiusMeters: number,
  ): Promise<FindNearbyGymsResult> {
    const snapshot = await this.fallback?.cache.load().catch(() => null);
    if (!snapshot) return { status: "search-failed" };

    const gyms = rankByDistance(center, snapshot.gyms, radiusMeters);
    // A pessoa saiu de perto da última busca: lista vazia diria "nenhuma
    // academia", o que não é verdade. O certo é dizer que a busca falhou.
    if (gyms.length === 0) return { status: "search-failed" };

    return { status: "found", center, gyms, cachedAt: snapshot.savedAt };
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
