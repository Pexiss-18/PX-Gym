import { InvalidValueError } from "../errors";

export type GeoPoint = {
  latitude: number;
  longitude: number;
  /** epoch ms do fix de GPS, quando disponível. */
  timestamp?: number;
};

/**
 * GeoPoint validado — é por aqui que coordenada vinda de sensor ou de API
 * entra no domínio. Latitude em [-90, 90], longitude em [-180, 180].
 */
export function geoPoint(
  latitude: number,
  longitude: number,
  timestamp?: number,
): GeoPoint {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new InvalidValueError(`Latitude inválida: ${latitude}`);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new InvalidValueError(`Longitude inválida: ${longitude}`);
  }
  return timestamp === undefined
    ? { latitude, longitude }
    : { latitude, longitude, timestamp };
}

const EARTH_RADIUS_M = 6371008.8;

/** Distância haversine entre dois pontos, em metros. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Distância percorrida em metros. */
export class Distance {
  private constructor(readonly meters: number) {}

  static fromMeters(meters: number): Distance {
    if (!Number.isFinite(meters) || meters < 0) {
      throw new InvalidValueError(`Distância inválida: ${meters}m`);
    }
    return new Distance(Math.round(meters));
  }

  /** Soma das distâncias entre pontos consecutivos de uma rota. */
  static alongPath(path: GeoPoint[]): Distance {
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += haversineMeters(path[i - 1]!, path[i]!);
    }
    return Distance.fromMeters(total);
  }

  get km(): number {
    return Math.round((this.meters / 1000) * 100) / 100;
  }
}

/** Duração em segundos. */
export class Duration {
  private constructor(readonly seconds: number) {}

  static fromSeconds(seconds: number): Duration {
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new InvalidValueError(`Duração inválida: ${seconds}s`);
    }
    return new Duration(Math.round(seconds));
  }

  static between(start: Date, end: Date): Duration {
    return Duration.fromSeconds((end.getTime() - start.getTime()) / 1000);
  }

  get minutes(): number {
    return this.seconds / 60;
  }
}

/** Ritmo médio em min/km; null quando a distância é curta demais pra fazer sentido. */
export function avgPaceMinPerKm(
  distance: Distance,
  duration: Duration,
): number | null {
  if (distance.meters < 50) return null;
  return Math.round((duration.minutes / (distance.meters / 1000)) * 100) / 100;
}
