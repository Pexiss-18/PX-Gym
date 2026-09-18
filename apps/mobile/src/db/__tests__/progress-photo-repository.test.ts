import { ProgressPhoto } from "@px/core";
import { DrizzleProgressPhotoRepository } from "../progress-photo-repository";
import { createTestDb } from "./sqlite-test-db";

function capture(id: string, userId: string, takenAt: string) {
  return ProgressPhoto.capture({
    id,
    userId,
    localUri: `file:///docs/progress-photos/${id}.jpg`,
    takenAt: new Date(takenAt),
  });
}

describe("DrizzleProgressPhotoRepository (SQLite real)", () => {
  let repo: DrizzleProgressPhotoRepository;
  let close: () => void;

  beforeEach(() => {
    const testDb = createTestDb();
    repo = new DrizzleProgressPhotoRepository(testDb.db);
    close = testDb.close;
  });
  afterEach(() => close());

  it("foto nasce pending, sem caminho remoto", async () => {
    await repo.save(capture("p1", "u1", "2026-09-01T10:00:00Z"));

    const [pending] = await repo.pendingUpload();

    expect(pending!.syncStatus).toBe("pending");
    expect(pending!.remotePath).toBeNull();
    expect(pending!.localUri).toBe("file:///docs/progress-photos/p1.jpg");
  });

  it("markUploaded grava o caminho do bucket e tira da fila", async () => {
    await repo.save(capture("p1", "u1", "2026-09-01T10:00:00Z"));
    await repo.save(capture("p2", "u1", "2026-09-02T10:00:00Z"));

    await repo.markUploaded("p1", "u1/p1.jpg");

    expect((await repo.pendingUpload()).map((p) => p.id)).toEqual(["p2"]);
    const [latest, older] = await repo.listByUser("u1");
    expect(latest!.id).toBe("p2");
    expect(older!.remotePath).toBe("u1/p1.jpg");
    expect(older!.syncStatus).toBe("synced");
  });

  it("listByUser devolve só as do dono, da mais nova pra mais velha", async () => {
    await repo.save(capture("a", "u1", "2026-09-01T10:00:00Z"));
    await repo.save(capture("b", "u2", "2026-09-05T10:00:00Z"));
    await repo.save(capture("c", "u1", "2026-09-03T10:00:00Z"));

    expect((await repo.listByUser("u1")).map((p) => p.id)).toEqual(["c", "a"]);
  });
});
