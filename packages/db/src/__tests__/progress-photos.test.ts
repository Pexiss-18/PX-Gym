import { CloudStorageFullError, ProgressPhoto } from "@px/core";
import type { PxSupabaseClient } from "../client";
import { SupabaseProgressPhotoStore } from "../repositories/progress-photos";

type Call = { target: string; op: string; args: unknown[] };

/**
 * Client falso com a superfície que o store usa: tabela progress_photos e
 * functions.invoke("photo-storage"). Registra as chamadas em ordem; `fail`
 * faz a operação com esse nome devolver erro.
 */
function fakeClient(
  opts: { rows?: unknown[]; fail?: string; invokeData?: unknown; invokeError?: unknown } = {},
) {
  const calls: Call[] = [];
  const result = (op: string, data: unknown = null) => ({
    data,
    error: opts.fail === op ? { message: `${op} falhou` } : null,
  });
  const client = {
    from(table: string) {
      const filters: unknown[] = [];
      const chain = {
        async upsert(...args: unknown[]) {
          calls.push({ target: table, op: "upsert", args });
          return result("upsert");
        },
        select(...args: unknown[]) {
          filters.push(["select", ...args]);
          return chain;
        },
        delete() {
          filters.push(["delete"]);
          return chain;
        },
        eq(...args: unknown[]) {
          filters.push(["eq", ...args]);
          // delete termina no segundo eq (id + user_id)
          if (filters[0]?.toString() === "delete" && filters.length === 3) {
            calls.push({ target: table, op: "delete", args: filters });
            return Promise.resolve(result("delete"));
          }
          return chain;
        },
        order(...args: unknown[]) {
          filters.push(["order", ...args]);
          calls.push({ target: table, op: "select", args: filters });
          return Promise.resolve(result("select", opts.rows ?? []));
        },
      };
      return chain;
    },
    functions: {
      async invoke(name: string, options: { body: unknown }) {
        calls.push({ target: name, op: "invoke", args: [options.body] });
        if (opts.invokeError) return { data: null, error: opts.invokeError };
        return result("invoke", opts.invokeData ?? { ok: true });
      },
    },
  };
  return { calls, client: client as unknown as PxSupabaseClient };
}

const photo = ProgressPhoto.capture({
  id: "p1",
  userId: "u1",
  localUri: "file:///docs/progress-photos/p1.jpg",
  takenAt: new Date("2026-10-20T08:00:00.000Z"),
  location: { latitude: -23.56, longitude: -46.65 },
});

describe("SupabaseProgressPhotoStore", () => {
  it("uploadTarget: pede a URL assinada à função com id e tamanho", async () => {
    const target = { url: "https://r2/x", headers: { "content-type": "image/jpeg" }, path: "u1/p1.jpg" };
    const { calls, client } = fakeClient({ invokeData: target });

    expect(await new SupabaseProgressPhotoStore(client).uploadTarget("p1", 412345)).toEqual(target);
    expect(calls).toEqual([
      { target: "photo-storage", op: "invoke", args: [{ action: "upload", photoId: "p1", size: 412345 }] },
    ]);
  });

  it("saveRow: linha com o caminho do R2 e sem a posição", async () => {
    const { calls, client } = fakeClient();

    await new SupabaseProgressPhotoStore(client).saveRow(photo, "u1/p1.jpg");

    expect(calls[0]!.args[0]).toEqual({
      id: "p1",
      user_id: "u1",
      storage_path: "u1/p1.jpg",
      taken_at: "2026-10-20T08:00:00.000Z",
      note: null,
    });
  });

  it("list: linhas do dono viram RemoteProgressPhoto", async () => {
    const { client } = fakeClient({
      rows: [
        { id: "p1", user_id: "u1", storage_path: "u1/p1.jpg", taken_at: "2026-10-20T08:00:00.000Z", note: "costas" },
      ],
    });

    expect(await new SupabaseProgressPhotoStore(client).list("u1")).toEqual([
      { id: "p1", userId: "u1", remotePath: "u1/p1.jpg", takenAt: new Date("2026-10-20T08:00:00.000Z"), note: "costas" },
    ]);
  });

  it("downloadUrl: devolve a URL que a função assinou", async () => {
    const { client } = fakeClient({ invokeData: { url: "https://r2/get" } });

    expect(await new SupabaseProgressPhotoStore(client).downloadUrl("p1")).toBe("https://r2/get");
  });

  it("remove: linha primeiro, depois o objeto no R2", async () => {
    const { calls, client } = fakeClient();

    await new SupabaseProgressPhotoStore(client).remove(photo);

    expect(calls.map((c) => `${c.target}.${c.op}`)).toEqual([
      "progress_photos.delete",
      "photo-storage.invoke",
    ]);
    expect(calls[1]!.args[0]).toEqual({ action: "delete", photoId: "p1" });
  });

  it("erro na linha não chega a apagar o objeto", async () => {
    const { calls, client } = fakeClient({ fail: "delete" });

    await expect(new SupabaseProgressPhotoStore(client).remove(photo)).rejects.toBeTruthy();
    expect(calls.map((c) => c.op)).toEqual(["delete"]);
  });

  it("erro da função propaga (o tombstone tenta de novo)", async () => {
    const { client } = fakeClient({ fail: "invoke" });

    await expect(new SupabaseProgressPhotoStore(client).remove(photo)).rejects.toBeTruthy();
  });

  it.each([
    ["user_quota", "user"],
    ["global_quota", "global"],
  ])("507 %s vira CloudStorageFullError(%s)", async (code, scope) => {
    const context = new Response(JSON.stringify({ error: "cheio", code }), { status: 507 });
    const { client } = fakeClient({ invokeError: { message: "non-2xx", context } });

    const error = await new SupabaseProgressPhotoStore(client)
      .uploadTarget("p1", 100)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CloudStorageFullError);
    expect((error as CloudStorageFullError).scope).toBe(scope);
  });

  it("outros erros da função passam como vieram", async () => {
    const original = { message: "non-2xx", context: new Response("{}", { status: 500 }) };
    const { client } = fakeClient({ invokeError: original });

    await expect(new SupabaseProgressPhotoStore(client).uploadTarget("p1", 100)).rejects.toBe(original);
  });
});
