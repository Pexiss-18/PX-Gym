import type { SetLog } from "../entities/set-log";
import type { Workout } from "../entities/workout";
import type { BodyAssessment } from "../entities/body-assessment";
import type {
  NutritionPlan,
  NutritionPlanDraft,
} from "../entities/nutrition-plan";
import type { ProgressPhoto } from "../entities/progress-photo";
import type { CardioSession } from "../entities/cardio-session";
import type { Gym } from "../entities/gym";
import type { GeoPoint } from "../value-objects/geo";

/*
 * Ports (interfaces) da Clean Architecture: o domínio define o contrato,
 * a infraestrutura implementa — SQLite/Drizzle no mobile, Supabase no
 * packages/db, fakes em memória nos testes.
 */

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export interface ConnectivityStatus {
  isOnline(): Promise<boolean>;
}

/** Persistência local (offline-first) dos registros de série. */
export interface SetLogRepository {
  save(log: SetLog): Promise<void>;
  /** Registros ainda não enviados ao backend. */
  pending(): Promise<SetLog[]>;
  markSynced(ids: string[]): Promise<void>;
  /** Apaga registros locais (série desmarcada pelo usuário). */
  remove(ids: string[]): Promise<void>;
  /** Última carga registrada por exercício, pra calcular progressão. */
  lastLoadKgForExercise(exerciseId: string): Promise<number | null>;
  bySessionDate(sessionDate: string): Promise<SetLog[]>;
}

/** Envio dos registros locais pro backend quando a conexão volta. */
export interface WorkoutSyncGateway {
  pushSetLogs(logs: SetLog[]): Promise<void>;
}

export interface WorkoutRepository {
  todaysWorkout(userId: string): Promise<Workout | null>;
  byId(id: string): Promise<Workout | null>;
}

export interface AssessmentRepository {
  byId(id: string): Promise<BodyAssessment | null>;
  listByUser(userId: string): Promise<BodyAssessment[]>;
  latestReviewed(userId: string): Promise<BodyAssessment | null>;
}

export interface NutritionPlanRepository {
  save(plan: NutritionPlan): Promise<void>;
  latestForUser(userId: string): Promise<NutritionPlan | null>;
  byAssessment(assessmentId: string): Promise<NutritionPlan | null>;
}

/** Gerador do plano nutricional (implementado pela Anthropic API no backend). */
export interface NutritionPlanGenerator {
  generate(assessment: BodyAssessment): Promise<NutritionPlanDraft>;
}

export interface ProgressPhotoRepository {
  save(photo: ProgressPhoto): Promise<void>;
  pendingUpload(): Promise<ProgressPhoto[]>;
  markUploaded(id: string, remotePath: string): Promise<void>;
  listByUser(userId: string): Promise<ProgressPhoto[]>;
}

/** Upload da foto pro storage remoto; retorna o caminho no bucket. */
export interface ProgressPhotoUploader {
  upload(photo: ProgressPhoto): Promise<string>;
}

/** Fonte de academias próximas (Overpass/OSM no mobile; trocável por Places). */
export interface NearbyGymsFinder {
  search(center: GeoPoint, radiusMeters: number): Promise<Gym[]>;
}

export interface CardioSessionRepository {
  save(session: CardioSession): Promise<void>;
  listByUser(userId: string): Promise<CardioSession[]>;
}
