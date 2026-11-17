import type { GeoPoint, Gym, NearbyGymsFinder } from "@px/core";
import { FirstAvailableGymFinder } from "../FirstAvailableGymFinder";

const center: GeoPoint = { latitude: -19.9245, longitude: -43.9352 };
const academia: Gym = { id: "node/1", name: "Volt", address: null, location: center };

function fonte(resultado: Gym[] | Error): NearbyGymsFinder & { search: jest.Mock } {
  return {
    search: jest.fn(async () => {
      if (resultado instanceof Error) throw resultado;
      return resultado;
    }),
  };
}

describe("FirstAvailableGymFinder", () => {
  it("usa a primeira fonte que responder, sem chamar as seguintes", async () => {
    const primeira = fonte([academia]);
    const segunda = fonte([]);

    const gyms = await new FirstAvailableGymFinder([primeira, segunda]).search(center, 3000);

    expect(gyms).toEqual([academia]);
    expect(primeira.search).toHaveBeenCalledWith(center, 3000);
    expect(segunda.search).not.toHaveBeenCalled();
  });

  it("fonte fora do ar: passa pra próxima", async () => {
    const segunda = fonte([academia]);

    const gyms = await new FirstAvailableGymFinder([fonte(new Error("502")), segunda]).search(center, 3000);

    expect(gyms).toEqual([academia]);
  });

  it("lista vazia é resposta válida (não há academia por perto), não falha", async () => {
    const segunda = fonte([academia]);

    expect(await new FirstAvailableGymFinder([fonte([]), segunda]).search(center, 3000)).toEqual([]);
    expect(segunda.search).not.toHaveBeenCalled();
  });

  it("todas fora do ar: lança erro com o motivo de cada uma", async () => {
    const finder = new FirstAvailableGymFinder([fonte(new Error("overpass 502")), fonte(new Error("nominatim 503"))]);

    await expect(finder.search(center, 3000)).rejects.toThrow(
      "Nenhuma fonte de academias respondeu: overpass 502; nominatim 503",
    );
  });
});
