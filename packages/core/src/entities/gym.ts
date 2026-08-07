import type { GeoPoint } from "../value-objects/geo";

/** Academia encontrada perto do usuário (fonte: OSM hoje; trocável por Places). */
export type Gym = {
  id: string;
  name: string;
  location: GeoPoint;
  address: string | null;
};

/** Gym enriquecida pelo use case com a distância até o usuário. */
export type NearbyGym = Gym & {
  distanceMeters: number;
};
