import type { Gym, NearbyGym } from "../entities/gym";
import type { GeoPoint } from "../value-objects/geo";
import { haversineMeters } from "../value-objects/geo";
import type { NearbyGymsFinder } from "../ports";

export type FindNearbyGymsInput = {
  center: GeoPoint;
  radiusMeters: number;
};

/**
 * Busca academias perto do usuário: o finder (OSM/Places) devolve candidatas
 * e aqui entra o que é regra nossa — distância real, corte pelo raio e
 * ordenação da mais perto pra mais longe.
 */
export class FindNearbyGymsUseCase {
  constructor(private readonly finder: NearbyGymsFinder) {}

  async execute(input: FindNearbyGymsInput): Promise<NearbyGym[]> {
    const found = await this.finder.search(input.center, input.radiusMeters);

    return found
      .map((gym: Gym) => ({
        ...gym,
        distanceMeters: Math.round(
          haversineMeters(input.center, gym.location),
        ),
      }))
      .filter((gym) => gym.distanceMeters <= input.radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }
}
