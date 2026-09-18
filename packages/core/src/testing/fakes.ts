import type { SetLog } from "../entities/set-log";
import type { ProgressPhoto } from "../entities/progress-photo";
import type { BodyAssessment } from "../entities/body-assessment";
import type { NutritionPlan } from "../entities/nutrition-plan";
import type { Gym } from "../entities/gym";
import type { GeoPoint } from "../value-objects/geo";
import { LocationUnavailableError } from "../errors";
import type {
  AssessmentRepository,
  AuthGateway,
  Clock,
  ConnectivityStatus,
  IdGenerator,
  LocationGateway,
  LocationPermission,
  NearbyGymsFinder,
  NutritionPlanRepository,
  ProgressPhotoRepository,
  ProgressPhotoUploader,
  SetLogRepository,
  SignInOutcome,
  SignUpOutcome,
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
  async byId(id: string) {
    return this.logs.find((l) => l.id === id) ?? null;
  }
  async pending() {
    return this.logs.filter((l) => l.syncStatus === "pending");
  }
  async markSynced(ids: string[]) {
    this.logs = this.logs.map((l) =>
      ids.includes(l.id) ? l.markSynced() : l,
    );
  }
  async markDeleted(ids: string[]) {
    this.logs = this.logs.map((l) =>
      ids.includes(l.id) ? l.markDeleted() : l,
    );
  }
  async deletedIds() {
    return this.logs
      .filter((l) => l.syncStatus === "deleted")
      .map((l) => l.id);
  }
  async remove(ids: string[]) {
    this.logs = this.logs.filter((l) => !ids.includes(l.id));
  }
  async lastLoadKgForExercise(exerciseId: string) {
    const forExercise = this.logs.filter(
      (l) => l.exerciseId === exerciseId && l.syncStatus !== "deleted",
    );
    const last = forExercise[forExercise.length - 1];
    return last ? last.load.kg : null;
  }
  async bySessionDate(sessionDate: string) {
    return this.logs.filter(
      (l) => l.sessionDate === sessionDate && l.syncStatus !== "deleted",
    );
  }
  async byExercise(exerciseId: string) {
    return this.logs.filter(
      (l) => l.exerciseId === exerciseId && l.syncStatus !== "deleted",
    );
  }
}

export class FakeSyncGateway implements WorkoutSyncGateway {
  pushed: SetLog[][] = [];
  deleted: string[][] = [];
  failNext = false;

  async pushSetLogs(logs: SetLog[]) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("network down");
    }
    this.pushed.push(logs);
  }

  async deleteSetLogs(ids: string[]) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("network down");
    }
    this.deleted.push(ids);
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

/**
 * GPS falso: `position` null simula aparelho sem fix; `onRequest` é a
 * resposta do "diálogo" de permissão.
 */
export class FakeLocation implements LocationGateway {
  requests = 0;

  constructor(
    public current: LocationPermission,
    public position: GeoPoint | null,
    public onRequest: LocationPermission = current,
  ) {}

  async permission() {
    return this.current;
  }
  async requestPermission() {
    this.requests++;
    this.current = this.onRequest;
    return this.current;
  }
  async currentPosition() {
    if (!this.position) throw new LocationUnavailableError("sem fix de GPS");
    return this.position;
  }
}

export class FakeGymFinder implements NearbyGymsFinder {
  searches: { center: GeoPoint; radiusMeters: number }[] = [];
  failNext = false;

  constructor(private readonly gyms: Gym[]) {}

  async search(center: GeoPoint, radiusMeters: number) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("overpass fora do ar");
    }
    this.searches.push({ center, radiusMeters });
    return this.gyms;
  }
}

/** Provedor de identidade falso: responde o que o cenário configurar. */
export class FakeAuthGateway implements AuthGateway {
  calls: { op: "signIn" | "signUp"; email: string }[] = [];
  signInOutcome: SignInOutcome = { ok: true };
  signUpOutcome: SignUpOutcome = { ok: true, needsConfirmation: false };
  signedOut = false;

  async signIn(email: string) {
    this.calls.push({ op: "signIn", email });
    return this.signInOutcome;
  }
  async signUp(email: string) {
    this.calls.push({ op: "signUp", email });
    return this.signUpOutcome;
  }
  async signOut() {
    this.signedOut = true;
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
