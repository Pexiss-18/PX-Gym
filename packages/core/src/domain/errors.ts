export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidValueError extends DomainError {}

export class BusinessRuleError extends DomainError {}

/** O aparelho não conseguiu dizer onde o usuário está (GPS frio, sem fix, serviço desligado). */
export class LocationUnavailableError extends DomainError {}

/** Onde a nuvem de fotos encheu: a cota do próprio usuário ou o armazenamento inteiro. */
export type CloudFullScope = "user" | "global";

/** A nuvem não aceita mais fotos agora. Elas continuam no aparelho, pending. */
export class CloudStorageFullError extends DomainError {
  constructor(readonly scope: CloudFullScope) {
    super(
      scope === "user"
        ? "Cota de fotos do usuário na nuvem esgotada"
        : "Armazenamento de fotos na nuvem esgotado",
    );
  }
}
