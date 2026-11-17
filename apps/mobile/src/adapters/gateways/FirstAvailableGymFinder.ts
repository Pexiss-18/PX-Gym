import type { GeoPoint, Gym, NearbyGymsFinder } from "@px/core";

/**
 * Tenta as fontes de academias em ordem e fica com a primeira que responder.
 * Lista vazia conta como resposta: "não há academia por perto" é verdade, não
 * falha. Só lança quando todas caem.
 */
export class FirstAvailableGymFinder implements NearbyGymsFinder {
  constructor(private readonly finders: readonly NearbyGymsFinder[]) {}

  async search(center: GeoPoint, radiusMeters: number): Promise<Gym[]> {
    const failures: string[] = [];
    for (const finder of this.finders) {
      try {
        return await finder.search(center, radiusMeters);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    throw new Error(`Nenhuma fonte de academias respondeu: ${failures.join("; ")}`);
  }
}
