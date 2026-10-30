import { ProgressPhoto } from "../../domain/entities/progress-photo";
import { CloudStorageFullError } from "../../domain/errors";
import {
  DeleteProgressPhotoUseCase,
  RestoreProgressPhotosUseCase,
  SyncPendingPhotosUseCase,
} from "../use-cases/save-progress-photo";
import {
  FakeConnectivity,
  FakePhotoCloud,
  FakePhotoFiles,
  FakeUploader,
  InMemoryPhotos,
} from "../../testing/fakes";

const TAKEN = new Date("2026-10-20T08:00:00Z");

function synced(id: string, userId = "u1") {
  return ProgressPhoto.capture({
    id,
    userId,
    localUri: `file:///docs/progress-photos/${id}.jpg`,
    takenAt: TAKEN,
  }).markUploaded(`${userId}/${id}.jpg`);
}

function remote(id: string, userId = "u1") {
  return { id, userId, remotePath: `${userId}/${id}.jpg`, takenAt: TAKEN, note: null };
}

describe("DeleteProgressPhotoUseCase", () => {
  const deps = (online: boolean) => {
    const photos = new InMemoryPhotos();
    const cloud = new FakePhotoCloud([remote("p1")]);
    const files = new FakePhotoFiles();
    const useCase = new DeleteProgressPhotoUseCase(
      photos,
      cloud,
      new FakeConnectivity(online),
      files,
    );
    return { photos, cloud, files, useCase };
  };

  it("online: apaga o arquivo, a nuvem e a linha", async () => {
    const { photos, cloud, files, useCase } = deps(true);
    await photos.save(synced("p1"));

    expect(await useCase.execute("p1")).toEqual({ status: "removed" });
    expect(files.removed).toEqual(["file:///docs/progress-photos/p1.jpg"]);
    expect(cloud.removed).toEqual(["p1"]);
    expect(await photos.knownIds("u1")).toEqual([]);
  });

  it("offline: some da galeria na hora e fica tombstone pro sync", async () => {
    const { photos, cloud, files, useCase } = deps(false);
    await photos.save(synced("p1"));

    expect(await useCase.execute("p1")).toEqual({ status: "pending-removal" });
    expect(files.removed).toHaveLength(1);
    expect(cloud.removed).toEqual([]);
    expect(await photos.listByUser("u1")).toEqual([]);
    expect((await photos.pendingDeletion()).map((p) => p.id)).toEqual(["p1"]);
  });

  it("nuvem falhando: continua tombstone", async () => {
    const { photos, cloud, useCase } = deps(true);
    await photos.save(synced("p1"));
    cloud.failNext = true;

    expect(await useCase.execute("p1")).toEqual({ status: "pending-removal" });
    expect(await photos.pendingDeletion()).toHaveLength(1);
  });

  it("foto que não existe (ou já apagada) não faz nada", async () => {
    const { photos, files, useCase } = deps(false);
    await photos.save(synced("p1"));
    await useCase.execute("p1");

    expect(await useCase.execute("p1")).toEqual({ status: "not-found" });
    expect(await useCase.execute("nada")).toEqual({ status: "not-found" });
    expect(files.removed).toHaveLength(1);
  });
});

describe("SyncPendingPhotosUseCase: tombstones", () => {
  it("apaga na nuvem e só então a linha local; falha fica pra próxima", async () => {
    const photos = new InMemoryPhotos();
    await photos.save(synced("p1").markDeleted());
    await photos.save(synced("p2").markDeleted());
    const cloud = new FakePhotoCloud([remote("p1"), remote("p2")]);
    cloud.failNext = true;
    const sync = new SyncPendingPhotosUseCase(
      photos,
      new FakeUploader(),
      new FakeConnectivity(true),
      cloud,
    );

    expect(await sync.execute()).toEqual({
      status: "done",
      uploaded: 0,
      removed: 1,
      failed: 1,
      cloudFull: null,
    });
    expect((await photos.pendingDeletion()).map((p) => p.id)).toEqual(["p1"]);

    expect(await sync.execute()).toMatchObject({ removed: 1, failed: 0 });
    expect(await photos.knownIds("u1")).toEqual([]);
  });
});

describe("SyncPendingPhotosUseCase: nuvem cheia", () => {
  function pending(id: string) {
    return ProgressPhoto.capture({
      id,
      userId: "u1",
      localUri: `file:///docs/progress-photos/${id}.jpg`,
      takenAt: TAKEN,
    });
  }

  it("para no primeiro 'cheio', conta as restantes como falha e diz o motivo", async () => {
    const photos = new InMemoryPhotos();
    for (const id of ["a", "b", "c"]) await photos.save(pending(id));
    const uploader = new FakeUploader();
    uploader.failWith = new CloudStorageFullError("user");
    const sync = new SyncPendingPhotosUseCase(
      photos,
      uploader,
      new FakeConnectivity(true),
      new FakePhotoCloud(),
    );

    expect(await sync.execute()).toEqual({
      status: "done",
      uploaded: 0,
      removed: 0,
      failed: 3,
      cloudFull: "user",
    });
    expect(uploader.attempts).toBe(1);
    expect(await photos.pendingUpload()).toHaveLength(3);
  });

  it("apagar libera espaço antes dos envios na mesma rodada", async () => {
    const photos = new InMemoryPhotos();
    await photos.save(synced("velha").markDeleted());
    await photos.save(pending("nova"));
    const cloud = new FakePhotoCloud([remote("velha")]);
    const sync = new SyncPendingPhotosUseCase(
      photos,
      new FakeUploader(),
      new FakeConnectivity(true),
      cloud,
    );

    expect(await sync.execute()).toMatchObject({ removed: 1, uploaded: 1, cloudFull: null });
  });
});

describe("RestoreProgressPhotosUseCase", () => {
  const deps = (online: boolean, cloud: FakePhotoCloud) => {
    const photos = new InMemoryPhotos();
    const useCase = new RestoreProgressPhotosUseCase(
      photos,
      cloud,
      new FakeConnectivity(online),
    );
    return { photos, useCase };
  };

  it("baixa só o que falta no aparelho, já como synced e sem posição", async () => {
    const cloud = new FakePhotoCloud([remote("p1"), remote("p2"), remote("x", "u2")]);
    const { photos, useCase } = deps(true, cloud);
    await photos.save(synced("p1"));

    expect(await useCase.execute("u1")).toEqual({
      status: "done",
      restored: 1,
      failed: 0,
    });
    const restored = await photos.byId("p2");
    expect(restored!.syncStatus).toBe("synced");
    expect(restored!.remotePath).toBe("u1/p2.jpg");
    expect(restored!.localUri).toBe("file:///docs/progress-photos/p2.jpg");
    expect(restored!.location).toBeNull();
    expect(restored!.takenAt).toEqual(TAKEN);
    expect(await photos.byId("x")).toBeNull();
  });

  it("não ressuscita foto apagada que ainda espera remoção na nuvem", async () => {
    const cloud = new FakePhotoCloud([remote("p1")]);
    const { photos, useCase } = deps(true, cloud);
    await photos.save(synced("p1").markDeleted());

    expect(await useCase.execute("u1")).toMatchObject({ restored: 0 });
    expect(cloud.downloads).toBe(0);
  });

  it("download falhando conta como falha e tenta as demais", async () => {
    const cloud = new FakePhotoCloud([remote("p1"), remote("p2")]);
    cloud.failNext = true;
    const { photos, useCase } = deps(true, cloud);

    expect(await useCase.execute("u1")).toEqual({
      status: "done",
      restored: 1,
      failed: 1,
    });
    expect(await photos.listByUser("u1")).toHaveLength(1);
  });

  it("offline: nem consulta a nuvem", async () => {
    const cloud = new FakePhotoCloud([remote("p1")]);
    const { photos, useCase } = deps(false, cloud);

    expect(await useCase.execute("u1")).toEqual({
      status: "offline",
      restored: 0,
      failed: 0,
    });
    expect(await photos.listByUser("u1")).toEqual([]);
  });
});
