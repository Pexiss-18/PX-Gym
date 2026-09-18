import { FindNearbyGymsUseCase } from "../use-cases/find-nearby-gyms";
import type { Gym } from "../entities/gym";
import type { GeoPoint } from "../value-objects/geo";
import { FakeGymFinder, FakeLocation } from "../testing/fakes";

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

function setup(gyms: Gym[], location = new FakeLocation("granted", center)) {
  const finder = new FakeGymFinder(gyms);
  return {
    finder,
    location,
    useCase: new FindNearbyGymsUseCase(finder, location),
  };
}

describe("FindNearbyGymsUseCase — ranking", () => {
  it("ordena da mais perto pra mais longe com distância calculada", async () => {
    const { useCase } = setup([
      gym("longe", 0.009), // ~1km
      gym("perto", 0.001), // ~111m
      gym("media", 0.004), // ~444m
    ]);

    const result = await useCase.execute({ radiusMeters: 3000 });

    if (result.status !== "found") throw new Error(result.status);
    expect(result.gyms.map((g) => g.id)).toEqual(["perto", "media", "longe"]);
    expect(result.gyms[0]!.distanceMeters).toBeGreaterThan(90);
    expect(result.gyms[0]!.distanceMeters).toBeLessThan(130);
    expect(result.center).toEqual(center);
  });

  it("descarta o que o finder devolver fora do raio pedido", async () => {
    const { useCase } = setup([gym("dentro", 0.001), gym("fora", 0.05)]);

    const result = await useCase.execute({ radiusMeters: 500 });

    if (result.status !== "found") throw new Error(result.status);
    expect(result.gyms.map((g) => g.id)).toEqual(["dentro"]);
  });

  it("repassa a posição do GPS e o raio pro finder", async () => {
    const { useCase, finder } = setup([]);

    await useCase.execute({ radiusMeters: 1234 });

    expect(finder.searches).toEqual([{ center, radiusMeters: 1234 }]);
  });

  it("devolve lista vazia sem academias por perto", async () => {
    const { useCase } = setup([]);
    expect(await useCase.execute({ radiusMeters: 3000 })).toEqual({
      status: "found",
      center,
      gyms: [],
    });
  });
});

describe("FindNearbyGymsUseCase — permissão de localização", () => {
  it("sem permissão e sem gesto do usuário: não abre diálogo nem busca", async () => {
    const location = new FakeLocation("undetermined", center, "granted");
    const { useCase, finder } = setup([gym("a", 0.001)], location);

    const result = await useCase.execute({ radiusMeters: 3000 });

    expect(result).toEqual({ status: "needs-permission", blocked: false });
    expect(location.requests).toBe(0);
    expect(finder.searches).toHaveLength(0);
  });

  it("com gesto do usuário: pede a permissão e segue a busca se concedida", async () => {
    const location = new FakeLocation("undetermined", center, "granted");
    const { useCase } = setup([gym("a", 0.001)], location);

    const result = await useCase.execute({
      radiusMeters: 3000,
      askPermission: true,
    });

    expect(location.requests).toBe(1);
    expect(result.status).toBe("found");
  });

  it("permissão negada no diálogo: fica em needs-permission", async () => {
    const location = new FakeLocation("undetermined", center, "denied");
    const { useCase } = setup([], location);

    const result = await useCase.execute({
      radiusMeters: 3000,
      askPermission: true,
    });

    expect(result).toEqual({ status: "needs-permission", blocked: false });
  });

  it("permissão bloqueada: sinaliza que só as configurações resolvem", async () => {
    const location = new FakeLocation("blocked", center);
    const { useCase } = setup([], location);

    const result = await useCase.execute({
      radiusMeters: 3000,
      askPermission: true,
    });

    expect(result).toEqual({ status: "needs-permission", blocked: true });
  });

  it("já concedida: não pergunta de novo", async () => {
    const location = new FakeLocation("granted", center);
    const { useCase } = setup([], location);

    await useCase.execute({ radiusMeters: 3000, askPermission: true });

    expect(location.requests).toBe(0);
  });
});

describe("FindNearbyGymsUseCase — falhas", () => {
  it("GPS sem posição vira location-unavailable, sem chamar o finder", async () => {
    const { useCase, finder } = setup(
      [gym("a", 0.001)],
      new FakeLocation("granted", null),
    );

    expect(await useCase.execute({ radiusMeters: 3000 })).toEqual({
      status: "location-unavailable",
    });
    expect(finder.searches).toHaveLength(0);
  });

  it("módulo de localização estourando não deixa a tela presa no 'buscando'", async () => {
    const location = new FakeLocation("granted", center);
    location.permission = async () => {
      throw new Error("location services unavailable");
    };
    const { useCase } = setup([], location);

    expect(await useCase.execute({ radiusMeters: 3000 })).toEqual({
      status: "location-unavailable",
    });
  });

  it("falha ao pedir a permissão também é resultado, não exceção", async () => {
    const location = new FakeLocation("undetermined", center);
    location.requestPermission = async () => {
      throw new Error("activity não disponível");
    };
    const { useCase } = setup([], location);

    expect(
      await useCase.execute({ radiusMeters: 3000, askPermission: true }),
    ).toEqual({ status: "location-unavailable" });
  });

  it("finder fora do ar vira search-failed", async () => {
    const { useCase, finder } = setup([gym("a", 0.001)]);
    finder.failNext = true;

    expect(await useCase.execute({ radiusMeters: 3000 })).toEqual({
      status: "search-failed",
    });
  });
});
