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
import type { Sessao } from "../value-objects/sessao";

export * from "./ciclo";

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

/**
 * Persistência local (offline-first) dos registros de série.
 * Tombstones (syncStatus "deleted") nunca aparecem nas consultas de leitura
 * (bySessionDate, lastLoadKgForExercise) — só em deletedIds(), pro sync.
 */
export interface SetLogRepository {
  save(log: SetLog): Promise<void>;
  byId(id: string): Promise<SetLog | null>;
  /** Registros ainda não enviados ao backend. */
  pending(): Promise<SetLog[]>;
  markSynced(ids: string[]): Promise<void>;
  /** Vira tombstone: série desmarcada que ainda precisa ser removida do backend. */
  markDeleted(ids: string[]): Promise<void>;
  /** Ids dos tombstones aguardando remoção remota. */
  deletedIds(): Promise<string[]>;
  /** Apaga registros locais de vez (série pending desmarcada ou tombstone já resolvido). */
  remove(ids: string[]): Promise<void>;
  /** Última carga registrada por exercício, pra calcular progressão. */
  lastLoadKgForExercise(exerciseId: string): Promise<number | null>;
  bySessionDate(sessionDate: string): Promise<SetLog[]>;
  /** Histórico completo de um exercício, pra montar a curva de progressão. */
  byExercise(exerciseId: string): Promise<SetLog[]>;
}

/** Envio dos registros locais pro backend quando a conexão volta. */
export interface WorkoutSyncGateway {
  pushSetLogs(logs: SetLog[]): Promise<void>;
  deleteSetLogs(ids: string[]): Promise<void>;
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
  byId(id: string): Promise<ProgressPhoto | null>;
  pendingUpload(): Promise<ProgressPhoto[]>;
  markUploaded(id: string, remotePath: string): Promise<void>;
  /** Galeria: as fotos apagadas (tombstones) ficam de fora. */
  listByUser(userId: string): Promise<ProgressPhoto[]>;
  /**
   * Todos os ids que o aparelho conhece, tombstones inclusive — é o que
   * impede a restauração de trazer de volta uma foto recém-apagada.
   */
  knownIds(userId: string): Promise<string[]>;
  markDeleted(id: string): Promise<void>;
  pendingDeletion(): Promise<ProgressPhoto[]>;
  /** Apaga a linha de vez (depois que a nuvem confirmou a remoção). */
  remove(id: string): Promise<void>;
}

/** Upload da foto pro storage remoto; retorna o caminho no bucket. */
export interface ProgressPhotoUploader {
  upload(photo: ProgressPhoto): Promise<string>;
}

/** Foto que existe na nuvem: linha da tabela + arquivo no bucket. */
export type RemoteProgressPhoto = {
  id: string;
  userId: string;
  remotePath: string;
  takenAt: Date;
  note: string | null;
};

/**
 * O resto do ciclo de vida da foto na nuvem. Remover é idempotente:
 * apagar o que já não existe não é erro (o retry do tombstone depende disso).
 */
export interface ProgressPhotoCloud {
  list(userId: string): Promise<RemoteProgressPhoto[]>;
  /** Baixa o arquivo pro aparelho e devolve a URI local. */
  download(photo: RemoteProgressPhoto): Promise<string>;
  remove(photo: ProgressPhoto): Promise<void>;
}

/** Arquivos de foto no aparelho. Apagar o que não existe não é erro. */
export interface LocalPhotoFiles {
  remove(localUri: string): void;
}

/** Fonte de academias próximas (Overpass/OSM no mobile; trocável por Places). */
export interface NearbyGymsFinder {
  search(center: GeoPoint, radiusMeters: number): Promise<Gym[]>;
}

/**
 * Estado da permissão de localização em primeiro plano. "blocked" = negada
 * sem poder perguntar de novo; só as configurações do sistema resolvem.
 */
export type LocationPermission =
  | "granted"
  | "undetermined"
  | "denied"
  | "blocked";

/** Gateway do GPS do aparelho (expo-location no mobile, fake nos testes). */
export interface LocationGateway {
  /** Consulta a permissão sem abrir diálogo nenhum. */
  permission(): Promise<LocationPermission>;
  /** Abre o diálogo do sistema — só chamar a partir de um gesto do usuário. */
  requestPermission(): Promise<LocationPermission>;
  /** Posição do usuário; lança LocationUnavailableError se não houver fix. */
  currentPosition(): Promise<GeoPoint>;
}

/** Por que o provedor de autenticação recusou a operação. */
export type AuthFailure =
  | "invalid-credentials"
  | "email-not-confirmed"
  | "email-taken"
  | "weak-password"
  | "rate-limited"
  | "network"
  | "unknown";

export type SignInOutcome =
  | { ok: true; sessao: Sessao }
  | { ok: false; reason: AuthFailure };

export type SignUpOutcome =
  | { ok: true; needsConfirmation: boolean }
  | { ok: false; reason: AuthFailure };

/** Gateway do provedor de identidade (Supabase Auth no packages/db). */
export interface AuthGateway {
  /** Em caso de sucesso, devolve a sessão já traduzida pro domínio (com papel). */
  signIn(email: string, password: string): Promise<SignInOutcome>;
  signUp(email: string, password: string): Promise<SignUpOutcome>;
  /** Encerra a sessão local — mesmo sem rede pra revogar no provedor. */
  signOut(): Promise<void>;
}

export interface CardioSessionRepository {
  save(session: CardioSession): Promise<void>;
  listByUser(userId: string): Promise<CardioSession[]>;
}
