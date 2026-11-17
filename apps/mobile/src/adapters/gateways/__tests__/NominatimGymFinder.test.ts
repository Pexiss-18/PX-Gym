import { NominatimGymFinder } from "../NominatimGymFinder";

const center = { latitude: -19.9245, longitude: -43.9352 };

function resposta(status: number, body: unknown = []) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const fitness = [
  {
    osm_type: "node",
    osm_id: 10,
    lat: "-19.9250",
    lon: "-43.9360",
    name: "RW Fitness",
    address: { road: "Rua A", house_number: "100" },
  },
  { osm_type: "way", osm_id: 20, lat: "-19.9300", lon: "-43.9400", name: "", address: {} },
];
const gym = [
  { osm_type: "node", osm_id: 10, lat: "-19.9250", lon: "-43.9360", name: "RW Fitness" },
  { osm_type: "node", osm_id: 30, lat: "-19.9100", lon: "-43.9300", name: "Box CrossFit", address: { road: "Rua B" } },
];

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

describe("NominatimGymFinder", () => {
  it("busca as duas categorias de academia do OSM e junta sem repetir", async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, fitness)).mockResolvedValueOnce(resposta(200, gym));

    const gyms = await new NominatimGymFinder().search(center, 3000);

    expect(gyms).toEqual([
      { id: "node/10", name: "RW Fitness", address: "Rua A, 100", location: { latitude: -19.925, longitude: -43.936 } },
      { id: "way/20", name: "Academia", address: null, location: { latitude: -19.93, longitude: -43.94 } },
      { id: "node/30", name: "Box CrossFit", address: "Rua B", location: { latitude: -19.91, longitude: -43.93 } },
    ]);
    const consultas = fetchMock.mock.calls.map(([url]) => new URL(url).searchParams.get("q"));
    expect(consultas).toEqual(["[leisure=fitness_centre]", "[amenity=gym]"]);
  });

  it("restringe a busca a um quadrado que cobre o raio em volta da posição", async () => {
    fetchMock.mockResolvedValue(resposta(200, []));

    await new NominatimGymFinder().search(center, 1000);

    const params = new URL(fetchMock.mock.calls[0][0]).searchParams;
    expect(params.get("bounded")).toBe("1");
    const [oeste, norte, leste, sul] = params.get("viewbox")!.split(",").map(Number);
    // 1 km ≈ 0,009° de latitude; a longitude abre um pouco mais pela latitude.
    expect(norte - center.latitude).toBeCloseTo(0.009, 3);
    expect(center.latitude - sul).toBeCloseTo(0.009, 3);
    expect(leste - center.longitude).toBeGreaterThan(0.009);
    expect(center.longitude - oeste).toBeCloseTo(leste - center.longitude, 6);
  });

  it("se identifica, como pede a política de uso do Nominatim", async () => {
    fetchMock.mockResolvedValue(resposta(200, []));

    await new NominatimGymFinder().search(center, 3000);

    expect(fetchMock.mock.calls[0][1].headers["User-Agent"]).toMatch(/^PxGYM/);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("a categoria principal falhando é erro da busca", async () => {
    fetchMock.mockResolvedValueOnce(resposta(503));

    await expect(new NominatimGymFinder().search(center, 3000)).rejects.toThrow("Nominatim respondeu 503");
  });

  it("a categoria secundária falhando não perde o que já veio", async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, fitness)).mockRejectedValueOnce(new Error("aborted"));

    const gyms = await new NominatimGymFinder().search(center, 3000);

    expect(gyms.map((g) => g.id)).toEqual(["node/10", "way/20"]);
  });
});
