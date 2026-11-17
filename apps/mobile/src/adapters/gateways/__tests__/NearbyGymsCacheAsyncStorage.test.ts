import AsyncStorage from "@react-native-async-storage/async-storage";
import { CHAVE_ACADEMIAS, NearbyGymsCacheAsyncStorage } from "../NearbyGymsCacheAsyncStorage";

// AsyncStorage em memória: o módulo nativo não existe no Node.
jest.mock("@react-native-async-storage/async-storage", () => {
  const dados = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      setItem: jest.fn(async (k: string, v: string) => void dados.set(k, v)),
      getItem: jest.fn(async (k: string) => dados.get(k) ?? null),
      clear: () => dados.clear(),
    },
  };
});

const storage = AsyncStorage as unknown as {
  setItem: jest.Mock;
  getItem: jest.Mock;
  clear: () => void;
};

const snapshot = {
  center: { latitude: -19.9245, longitude: -43.9352 },
  gyms: [
    { id: "node/1", name: "Academia Volt", address: null, location: { latitude: -19.925, longitude: -43.935 } },
  ],
  savedAt: new Date("2026-11-03T17:20:00Z"),
};

beforeEach(() => storage.clear());

describe("NearbyGymsCacheAsyncStorage", () => {
  it("guarda e devolve a última busca, com a data de volta como Date", async () => {
    const cache = new NearbyGymsCacheAsyncStorage();

    await cache.save(snapshot);

    expect(await cache.load()).toEqual(snapshot);
    expect(storage.setItem).toHaveBeenCalledWith(CHAVE_ACADEMIAS, expect.any(String));
  });

  it("sem nada guardado: null", async () => {
    expect(await new NearbyGymsCacheAsyncStorage().load()).toBeNull();
  });

  it("conteúdo corrompido ou de outro formato: null, sem lançar", async () => {
    const cache = new NearbyGymsCacheAsyncStorage();

    await storage.setItem(CHAVE_ACADEMIAS, "{não é json");
    expect(await cache.load()).toBeNull();

    await storage.setItem(CHAVE_ACADEMIAS, JSON.stringify({ gyms: "x" }));
    expect(await cache.load()).toBeNull();

    await storage.setItem(CHAVE_ACADEMIAS, JSON.stringify({ ...snapshot, savedAt: "ontem" }));
    expect(await cache.load()).toBeNull();
  });
});
