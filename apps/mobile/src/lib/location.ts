import * as Location from "expo-location";
import {
  geoPoint,
  LocationUnavailableError,
  type GeoPoint,
  type LocationGateway,
  type LocationPermission,
} from "@px/core";

function toPermission(
  response: Location.LocationPermissionResponse,
): LocationPermission {
  if (response.granted) return "granted";
  if (response.status === Location.PermissionStatus.UNDETERMINED) {
    return "undetermined";
  }
  return response.canAskAgain ? "denied" : "blocked";
}

/**
 * Implementação expo-location do LocationGateway: só primeiro plano, precisão
 * balanceada e posição pontual (nada de rastreamento contínuo).
 */
export class ExpoLocationGateway implements LocationGateway {
  async permission(): Promise<LocationPermission> {
    return toPermission(await Location.getForegroundPermissionsAsync());
  }

  async requestPermission(): Promise<LocationPermission> {
    return toPermission(await Location.requestForegroundPermissionsAsync());
  }

  /**
   * Plano B embutido: um fix novo pode simplesmente não sair (GPS frio,
   * ambiente fechado, emulador) e aí `getCurrentPositionAsync` estoura. Pra
   * raio de alguns km a última posição conhecida serve igual — sem limite de
   * idade de propósito.
   */
  async currentPosition(): Promise<GeoPoint> {
    let position: Location.LocationObject | null;
    try {
      position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch {
      position = await Location.getLastKnownPositionAsync().catch(() => null);
    }
    if (!position) {
      throw new LocationUnavailableError("Nenhuma posição disponível");
    }
    return geoPoint(
      position.coords.latitude,
      position.coords.longitude,
      position.timestamp,
    );
  }
}
