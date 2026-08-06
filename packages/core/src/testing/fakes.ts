import type { SetLog } from "../entities/set-log";
import type { ProgressPhoto } from "../entities/progress-photo";
import type { BodyAssessment } from "../entities/body-assessment";
import type { NutritionPlan } from "../entities/nutrition-plan";
import type {
  AssessmentRepository,
  Clock,
  ConnectivityStatus,
  IdGenerator,
  NutritionPlanRepository,
  ProgressPhotoRepository,
  ProgressPhotoUploader,
  SetLogRepository,
  WorkoutSyncGateway,
} from "../ports";

export class FixedClock implements Clock {
  constructor(private readonly date: Date) {}
  now() {
    return this.date;
  }
}

export class SequenceIds implements IdGenerator {
  private n = 0;
  next() {
    return `id-${++this.n}`;
  }
}

export class FakeConnectivity implements ConnectivityStatus {
  constructor(public online: boolean) {}
  async isOnline() {
    return this.online;
  }
}

export class InMemorySetLogs implements SetLogRepository {
  logs: SetLog[] = [];

  async save(log: SetLog) {
    this.logs.push(log);
  }
  async pending() {
    return this.logs.filter((l) => l.syncStatus === "pending");
  }
  async markSynced(ids: string[]) {
    this.logs = this.logs.map((l) =>
      ids.includes(l.id) ? l.markSynced() : l,
    );
  }
  async lastLoadKgForExercise(exerciseId: string) {
    const forExercise = this.logs.filter((l) => l.exerciseId === exerciseId);
    const last = forExercise[forExercise.length - 1];
    return last ? last.load.kg : null;
  }
  async bySessionDate(sessionDate: string) {
    return this.logs.filter((l) => l.sessionDate === sessionDate);
  }
}

export class FakeSyncGateway implements WorkoutSyncGateway {
  pushed: SetLog[][] = [];
  failNext = false;

  async pushSetLogs(logs: SetLog[]) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("network down");
    }
    this.pushed.push(logs);
  }
}

export class InMemoryPhotos implements ProgressPhotoRepository {
  photos: ProgressPhoto[] = [];

  async save(photo: ProgressPhoto) {
    this.photos.push(photo);
  }
  async pendingUpload() {
    return this.photos.filter((p) => p.syncStatus === "pending");
  }
  async markUploaded(id: string, remotePath: string) {
    this.photos = this.photos.map((p) =>
      p.id === id ? p.markUploaded(remotePath) : p,
    );
  }
  async listByUser(userId: string) {
    return this.photos.filter((p) => p.userId === userId);
  }
}

export class FakeUploader implements ProgressPhotoUploader {
  uploads = 0;
  failNext = false;

  async upload(photo: ProgressPhoto) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("upload failed");
    }
    this.uploads++;
    return `${photo.userId}/progress/${photo.id}.jpg`;
  }
}

export class InMemoryAssessments implements AssessmentRepository {
  constructor(public assessments: BodyAssessment[] = []) {}

  async byId(id: string) {
    return this.assessments.find((a) => a.id === id) ?? null;
  }
  async listByUser(userId: string) {
    return this.assessments.filter((a) => a.userId === userId);
  }
  async latestReviewed(userId: string) {
    return (
      this.assessments
        .filter((a) => a.userId === userId && a.status === "reviewed")
        .sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())[0] ??
      null
    );
  }
}

export class InMemoryPlans implements NutritionPlanRepository {
  plans: NutritionPlan[] = [];

  async save(plan: NutritionPlan) {
    this.plans.push(plan);
  }
  async latestForUser(userId: string) {
    return this.plans.filter((p) => p.userId === userId).slice(-1)[0] ?? null;
  }
  async byAssessment(assessmentId: string) {
    return this.plans.find((p) => p.assessmentId === assessmentId) ?? null;
  }
}
