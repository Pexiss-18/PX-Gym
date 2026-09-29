import { InvalidValueError } from "../errors";
import { haversineMeters } from "./geo";

/**
 * Onde e quando um treino foi registrado (check-in na academia). Validada na
 * criação: coordenada fora da faixa ou data inválida nunca entra no domínio.
 */
export class Coordenada {
  private constructor(
    readonly latitude: number,
    readonly longitude: number,
    readonly timestamp: Date,
  ) {
    Object.freeze(this);
  }

  static criar(latitude: number, longitude: number, timestamp: Date): Coordenada {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new InvalidValueError(`Latitude inválida: ${latitude}`);
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new InvalidValueError(`Longitude inválida: ${longitude}`);
    }
    if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
      throw new InvalidValueError("Marca temporal inválida.");
    }
    // Cópia: o Date de fora continua mutável, o nosso não pode mudar.
    return new Coordenada(latitude, longitude, new Date(timestamp.getTime()));
  }

  /** Distância em metros até outra coordenada (haversine). */
  distanciaAte(outra: Coordenada): number {
    return Math.round(
      haversineMeters(
        { latitude: this.latitude, longitude: this.longitude },
        { latitude: outra.latitude, longitude: outra.longitude },
      ),
    );
  }

  equals(outra: Coordenada): boolean {
    return (
      this.latitude === outra.latitude &&
      this.longitude === outra.longitude &&
      this.timestamp.getTime() === outra.timestamp.getTime()
    );
  }
}
