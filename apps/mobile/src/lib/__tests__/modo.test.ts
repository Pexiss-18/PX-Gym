import { desligadoNoMock } from "../modo";

const openDatabaseSync = jest.fn(() => ({}));
const createPxSupabaseClient = jest.fn(() => ({
  auth: { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() },
}));
const addEventListener = jest.fn();

jest.mock("expo-sqlite", () => ({ openDatabaseSync }));
jest.mock("drizzle-orm/expo-sqlite", () => ({ drizzle: (sqlite: unknown) => ({ sqlite }) }));
jest.mock("@px/db", () => ({ createPxSupabaseClient }));
jest.mock("react-native", () => ({ AppState: { addEventListener } }));
jest.mock("react-native-url-polyfill/auto", () => ({}));
jest.mock("@react-native-async-storage/async-storage", () => ({}));
jest.mock("expo-secure-store", () => ({}));
jest.mock("expo-crypto", () => ({}));

/** Recarrega os módulos de infraestrutura com o modo pedido. */
function carregar(modoMock: string | undefined) {
  jest.resetModules();
  jest.clearAllMocks();
  if (modoMock === undefined) delete process.env.EXPO_PUBLIC_MODO_MOCK;
  else process.env.EXPO_PUBLIC_MODO_MOCK = modoMock;
  return {
    modo: require("../modo") as typeof import("../modo"),
    banco: require("@/db") as typeof import("@/db"),
    nuvem: require("../supabase") as typeof import("../supabase"),
  };
}

describe("modo mock", () => {
  afterAll(() => {
    delete process.env.EXPO_PUBLIC_MODO_MOCK;
  });

  it("EXPO_PUBLIC_MODO_MOCK=1 não abre o SQLite nem cria o cliente do Supabase", () => {
    const { modo } = carregar("1");

    expect(modo.MODO_MOCK).toBe(true);
    expect(openDatabaseSync).not.toHaveBeenCalled();
    expect(createPxSupabaseClient).not.toHaveBeenCalled();
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it("usar o banco ou a nuvem no modo mock falha na hora, dizendo qual", () => {
    const { banco, nuvem } = carregar("1");

    expect(() => banco.db.select).toThrow(/SQLite está desligado.*select/);
    expect(() => nuvem.supabase.auth).toThrow(/Supabase está desligado.*auth/);
  });

  it("o padrão é o app real: abre o SQLite e cria o cliente do Supabase", () => {
    const { modo } = carregar(undefined);

    expect(modo.MODO_MOCK).toBe(false);
    expect(openDatabaseSync).toHaveBeenCalledWith("pxgym.db", { enableChangeListener: true });
    expect(createPxSupabaseClient).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("inspecionar o substituto por símbolo não lança", () => {
    const stub = desligadoNoMock<Record<string | symbol, unknown>>("X");
    expect(stub[Symbol.toPrimitive]).toBeUndefined();
  });
});
