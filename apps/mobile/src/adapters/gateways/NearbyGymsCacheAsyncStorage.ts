import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NearbyGymsCache, NearbyGymsSnapshot } from "@px/core";

export const CHAVE_ACADEMIAS = "pxgym.academias.ultima-busca";

/**
 * Última busca de academias no AsyncStorage do aparelho. É um cache: o que
 * vier estragado ou em outro formato é tratado como "não tem", nunca como erro.
 */
export class NearbyGymsCacheAsyncStorage implements NearbyGymsCache {
  async save(snapshot: NearbyGymsSnapshot): Promise<void> {
    await AsyncStorage.setItem(
      CHAVE_ACADEMIAS,
      JSON.stringify({ ...snapshot, savedAt: snapshot.savedAt.toISOString() }),
    );
  }

  async load(): Promise<NearbyGymsSnapshot | null> {
    const raw = await AsyncStorage.getItem(CHAVE_ACADEMIAS);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw) as Partial<Record<keyof NearbyGymsSnapshot, unknown>>;
      const savedAt = new Date(String(data.savedAt));
      if (!Array.isArray(data.gyms) || !data.center || Number.isNaN(savedAt.getTime())) {
        return null;
      }
      return {
        center: data.center as NearbyGymsSnapshot["center"],
        gyms: data.gyms as NearbyGymsSnapshot["gyms"],
        savedAt,
      };
    } catch {
      return null;
    }
  }
}
