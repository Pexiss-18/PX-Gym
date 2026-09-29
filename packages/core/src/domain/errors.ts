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
