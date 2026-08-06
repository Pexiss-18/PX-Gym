import { CardioSession } from "../entities/cardio-session";
import { BusinessRuleError } from "../errors";
import type { GeoPoint } from "../value-objects/geo";
import type { CardioSessionRepository, IdGenerator } from "../ports";

export type RecordCardioSessionInput = {
  userId: string;
  startedAt: Date;
  endedAt: Date;
  path: GeoPoint[];
};

/** Persiste uma corrida rastreada por GPS, com distância/tempo derivados da rota. */
export class RecordCardioSessionUseCase {
  constructor(
    private readonly sessions: CardioSessionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: RecordCardioSessionInput): Promise<CardioSession> {
    if (input.endedAt.getTime() <= input.startedAt.getTime()) {
      throw new BusinessRuleError("Sessão de cardio com duração inválida");
    }
    if (input.path.length < 2) {
      throw new BusinessRuleError(
        "Rota insuficiente pra registrar a corrida (mínimo 2 pontos de GPS)",
      );
    }

    const session = CardioSession.finish({
      id: this.ids.next(),
      userId: input.userId,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      path: input.path,
    });

    await this.sessions.save(session);
    return session;
  }
}
