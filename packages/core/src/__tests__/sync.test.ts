import { RegisterSetUseCase } from "../use-cases/register-set";
import { SyncPendingSetLogsUseCase } from "../use-cases/sync-pending-set-logs";
import {
  SaveProgressPhotoUseCase,
  SyncPendingPhotosUseCase,
} from "../use-cases/save-progress-photo";
import {
  FakeConnectivity,
  FakeSyncGateway,
  FakeUploader,
  FixedClock,
  InMemoryPhotos,
  InMemorySetLogs,
  SequenceIds,
} from "../testing/fakes";

const NOW = new Date("2026-08-06T19:00:00");

async function repoWithLogs(count: number) {
  const repo = new InMemorySetLogs();
  const register = new RegisterSetUseCase(
    repo,
    new FixedClock(NOW),
    new SequenceIds(),
  );
  for (let i = 1; i <= count; i++) {
    await register.execute({
      exerciseId: "agachamento",
      exerciseName: "Agachamento livre",
      setNumber: i,
      targetReps: 6,
      loadKg: 80,
    });
  }
  return repo;
}

describe("SyncPendingSetLogsUseCase", () => {
  it("offline: não toca no repositório nem no gateway", async () => {
    const repo = await repoWithLogs(2);
    const gateway = new FakeSyncGateway();
    const sync = new SyncPendingSetLogsUseCase(
      repo,
      gateway,
      new FakeConnectivity(false),
    );

    const result = await sync.execute();

    expect(result.status).toBe("offline");
    expect(gateway.pushed).toHaveLength(0);
    expect(await repo.pending()).toHaveLength(2);
  });

  it("online: empurra pendentes e marca como synced", async () => {
    const repo = await repoWithLogs(3);
    const gateway = new FakeSyncGateway();
    const sync = new SyncPendingSetLogsUseCase(
      repo,
      gateway,
      new FakeConnectivity(true),
    );

    const result = await sync.execute();

    expect(result).toEqual({ status: "synced", synced: 3 });
    expect(gateway.pushed[0]).toHaveLength(3);
    expect(await repo.pending()).toHaveLength(0);
  });

  it("falha no push mantém tudo pending (nada se perde)", async () => {
    const repo = await repoWithLogs(2);
    const gateway = new FakeSyncGateway();
    gateway.failNext = true;
    const sync = new SyncPendingSetLogsUseCase(
      repo,
      gateway,
      new FakeConnectivity(true),
    );

    await expect(sync.execute()).rejects.toThrow("network down");
    expect(await repo.pending()).toHaveLength(2);
  });
});

describe("SaveProgressPhotoUseCase", () => {
  const deps = (online: boolean) => {
    const photos = new InMemoryPhotos();
    const uploader = new FakeUploader();
    const useCase = new SaveProgressPhotoUseCase(
      photos,
      uploader,
      new FakeConnectivity(online),
      new FixedClock(NOW),
      new SequenceIds(),
    );
    return { photos, uploader, useCase };
  };

  it("offline: salva local como pending, sem tentar upload", async () => {
    const { photos, uploader, useCase } = deps(false);

    const photo = await useCase.execute({
      userId: "user-1",
      localUri: "file:///photos/1.jpg",
    });

    expect(photo.syncStatus).toBe("pending");
    expect(uploader.uploads).toBe(0);
    expect(await photos.pendingUpload()).toHaveLength(1);
  });

  it("online: salva e já sobe pro bucket", async () => {
    const { photos, useCase } = deps(true);

    const photo = await useCase.execute({
      userId: "user-1",
      localUri: "file:///photos/1.jpg",
    });

    expect(photo.syncStatus).toBe("synced");
    expect(photo.remotePath).toBe("user-1/progress/id-1.jpg");
    expect(await photos.pendingUpload()).toHaveLength(0);
  });

  it("upload falhando não derruba o salvamento local", async () => {
    const { photos, uploader, useCase } = deps(true);
    uploader.failNext = true;

    const photo = await useCase.execute({
      userId: "user-1",
      localUri: "file:///photos/1.jpg",
    });

    expect(photo.syncStatus).toBe("pending");
    expect(await photos.pendingUpload()).toHaveLength(1);
  });

  it("sync posterior sobe as pendentes e pula as que falharem", async () => {
    const { photos, uploader, useCase } = deps(false);
    await useCase.execute({ userId: "u", localUri: "file:///a.jpg" });
    await useCase.execute({ userId: "u", localUri: "file:///b.jpg" });

    uploader.failNext = true; // primeira falha, segunda sobe
    const sync = new SyncPendingPhotosUseCase(
      photos,
      uploader,
      new FakeConnectivity(true),
    );

    expect(await sync.execute()).toBe(1);
    expect(await photos.pendingUpload()).toHaveLength(1);
  });
});
