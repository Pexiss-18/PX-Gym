import * as SecureStore from "expo-secure-store";
import type { Sessao } from "@px/core";
import { CHAVE_SESSAO, SessionStorageSecureStore } from "../SessionStorageSecureStore";

// expo-secure-store é nativo (Keychain/Keystore): no teste, um Map faz o papel.
jest.mock("expo-secure-store", () => {
  const cofre = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
    setItemAsync: jest.fn(async (k: string, v: string) => void cofre.set(k, v)),
    getItemAsync: jest.fn(async (k: string) => cofre.get(k) ?? null),
    deleteItemAsync: jest.fn(async (k: string) => void cofre.delete(k)),
    __cofre: cofre,
  };
});

const cofre = (SecureStore as unknown as { __cofre: Map<string, string> }).__cofre;

const sessao: Sessao = {
  usuario: { id: "u-1", nome: "Paulo", email: "paulo@pxgym.dev", papel: "aluno" },
  token: "tok-abc",
  expiraEm: new Date("2026-10-01T12:00:00.000Z"),
};

beforeEach(() => {
  cofre.clear();
  jest.clearAllMocks();
});

describe("SessionStorageSecureStore", () => {
  it("salva cifrado no SecureStore, só neste aparelho", async () => {
    await new SessionStorageSecureStore().salvar(sessao);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(CHAVE_SESSAO, expect.any(String), {
      keychainAccessible: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
    });
    expect(JSON.parse(cofre.get(CHAVE_SESSAO)!)).toMatchObject({
      token: "tok-abc",
      expiraEm: "2026-10-01T12:00:00.000Z",
    });
  });

  it("carrega de volta com as datas como Date", async () => {
    const storage = new SessionStorageSecureStore();
    await storage.salvar(sessao);
    expect(await storage.carregar()).toEqual(sessao);
  });

  it("sessão sem expiração (provedor renova) sobrevive à ida e volta", async () => {
    const storage = new SessionStorageSecureStore();
    await storage.salvar({ ...sessao, expiraEm: null });
    expect((await storage.carregar())!.expiraEm).toBeNull();
  });

  it("nada salvo = null", async () => {
    expect(await new SessionStorageSecureStore().carregar()).toBeNull();
  });

  it("limpar apaga do cofre", async () => {
    const storage = new SessionStorageSecureStore();
    await storage.salvar(sessao);
    await storage.limpar();
    expect(cofre.has(CHAVE_SESSAO)).toBe(false);
    expect(await storage.carregar()).toBeNull();
  });

  it.each([
    ["JSON quebrado", "{nao é json"],
    ["papel desconhecido", JSON.stringify({ usuario: { id: "u", nome: "n", email: "e", papel: "admin" }, token: "t", expiraEm: null })],
    ["sem token", JSON.stringify({ usuario: { id: "u", nome: "n", email: "e", papel: "aluno" }, expiraEm: null })],
    ["sem usuário", JSON.stringify({ token: "t", expiraEm: null })],
    ["data inválida", JSON.stringify({ usuario: { id: "u", nome: "n", email: "e", papel: "aluno" }, token: "t", expiraEm: "ontem" })],
  ])("conteúdo inválido (%s) é descartado e apagado", async (_caso, texto) => {
    cofre.set(CHAVE_SESSAO, texto);
    expect(await new SessionStorageSecureStore().carregar()).toBeNull();
    expect(cofre.has(CHAVE_SESSAO)).toBe(false);
  });

  it("aceita chave própria (várias sessões isoladas)", async () => {
    await new SessionStorageSecureStore("outra.chave").salvar(sessao);
    expect(cofre.has("outra.chave")).toBe(true);
    expect(cofre.has(CHAVE_SESSAO)).toBe(false);
  });
});
