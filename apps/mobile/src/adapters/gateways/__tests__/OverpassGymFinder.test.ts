import { OverpassGymFinder } from "../OverpassGymFinder";

const center = { latitude: -19.9245, longitude: -43.9352 };
const ENDPOINTS = ["https://principal/api", "https://espelho-1/api", "https://espelho-2/api"];

function resposta(status: number, body: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const academia = {
  elements: [
    { type: "node", id: 1, lat: -19.925, lon: -43.935, tags: { name: "Academia Volt", "addr:street": "Rua A", "addr:housenumber": "10" } },
    { type: "way", id: 2, center: { lat: -19.93, lon: -43.94 }, tags: {} },
    { type: "relation", id: 3, tags: { name: "Sem posição" } },
  ],
};

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

describe("OverpassGymFinder", () => {
  it("converte a resposta do Overpass em academias do domínio", async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, academia));

    const gyms = await new OverpassGymFinder(ENDPOINTS).search(center, 3000);

    expect(gyms).toEqual([
      { id: "node/1", name: "Academia Volt", address: "Rua A, 10", location: { latitude: -19.925, longitude: -43.935 } },
      { id: "way/2", name: "Academia", address: null, location: { latitude: -19.93, longitude: -43.94 } },
    ]);
  });

  it("manda o raio e a posição na consulta, identificado pela política de uso", async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, { elements: [] }));

    await new OverpassGymFinder(ENDPOINTS).search(center, 1234);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(ENDPOINTS[0]);
    expect(decodeURIComponent(init.body)).toContain("around:1234,-19.9245,-43.9352");
    expect(init.headers["User-Agent"]).toMatch(/^PxGYM/);
  });

  it("servidor lotado (502): tenta o próximo espelho", async () => {
    fetchMock
      .mockResolvedValueOnce(resposta(502))
      .mockResolvedValueOnce(resposta(200, academia));

    const gyms = await new OverpassGymFinder(ENDPOINTS).search(center, 3000);

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(ENDPOINTS.slice(0, 2));
    expect(gyms).toHaveLength(2);
  });

  it("erro de rede ou timeout num servidor: tenta o próximo", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("The operation was aborted"))
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(resposta(200, { elements: [] }));

    await expect(new OverpassGymFinder(ENDPOINTS).search(center, 3000)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("todos fora do ar: lança erro com o motivo de cada um", async () => {
    fetchMock
      .mockResolvedValueOnce(resposta(502))
      .mockResolvedValueOnce(resposta(429))
      .mockRejectedValueOnce(new Error("aborted"));

    await expect(new OverpassGymFinder(ENDPOINTS).search(center, 3000)).rejects.toThrow(
      "Overpass indisponível: https://principal/api 502; https://espelho-1/api 429; https://espelho-2/api aborted",
    );
  });

  it("cada tentativa tem timeout próprio", async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, { elements: [] }));

    await new OverpassGymFinder(ENDPOINTS).search(center, 3000);

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
