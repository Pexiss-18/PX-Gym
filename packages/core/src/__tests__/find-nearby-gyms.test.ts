import { FindNearbyGymsUseCase } from "../use-cases/find-nearby-gyms";
import type { Gym } from "../entities/gym";
import type { GeoPoint } from "../value-objects/geo";
import type { NearbyGymsFinder } from "../ports";

// Centro de BH; deslocamentos de ~0.001 grau ≈ 111m de latitude.
const center: GeoPoint = { latitude: -19.9245, longitude: -43.9352 };

function gym(id: string, dLat: number, name = `Academia ${id}`): Gym {
  return {
    id,
    name,
    location: {
      latitude: center.latitude + dLat,
      longitude: center.longitude,
    },
    address: null,
  };
}

class FakeFinder implements NearbyGymsFinder {
  constructor(private readonly gyms: Gym[]) {}
  searches: { center: GeoPoint; radiusMeters: number }[] = [];

  async search(c: GeoPoint, radiusMeters: number) {
    this.searches.push({ center: c, radiusMeters });
    return this.gyms;
  }
}

describe("FindNearbyGymsUseCase", () => {
  it("ordena da mais perto pra mais longe com distância calculada", async () => {
    const finder = new FakeFinder([
      gym("longe", 0.009), // ~1km
      gym("perto", 0.001), // ~111m
      gym("media", 0.004), // ~444m
    ]);
    const useCase = new FindNearbyGymsUseCase(finder);

    const result = await useCase.execute({ center, radiusMeters: 3000 });

    expect(result.map((g) => g.id)).toEqual(["perto", "media", "longe"]);
    expect(result[0]!.distanceMeters).toBeGreaterThan(90);
    expect(result[0]!.distanceMeters).toBeLessThan(130);
  });

  it("descarta o que o finder devolver fora do raio pedido", async () => {
    const finder = new FakeFinder([gym("dentro", 0.001), gym("fora", 0.05)]);
    const useCase = new FindNearbyGymsUseCase(finder);

    const result = await useCase.execute({ center, radiusMeters: 500 });

    expect(result.map((g) => g.id)).toEqual(["dentro"]);
  });

  it("repassa centro e raio pro finder", async () => {
    const finder = new FakeFinder([]);
    const useCase = new FindNearbyGymsUseCase(finder);

    await useCase.execute({ center, radiusMeters: 1234 });

    expect(finder.searches).toEqual([{ center, radiusMeters: 1234 }]);
  });

  it("devolve lista vazia sem academias por perto", async () => {
    const useCase = new FindNearbyGymsUseCase(new FakeFinder([]));
    expect(await useCase.execute({ center, radiusMeters: 3000 })).toEqual([]);
  });
});
