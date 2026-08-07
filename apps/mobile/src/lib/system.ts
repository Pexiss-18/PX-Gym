import * as Crypto from "expo-crypto";
import NetInfo from "@react-native-community/netinfo";
import type { Clock, ConnectivityStatus, IdGenerator } from "@px/core";

/* Implementações de sistema dos ports do @px/core. */

export const systemClock: Clock = {
  now: () => new Date(),
};

export const cryptoIds: IdGenerator = {
  next: () => Crypto.randomUUID(),
};

export const netInfoConnectivity: ConnectivityStatus = {
  async isOnline() {
    const state = await NetInfo.fetch();
    // isInternetReachable começa null enquanto o NetInfo sonda; só bloqueia
    // o sync quando ele afirma explicitamente que não há internet.
    return !!state.isConnected && state.isInternetReachable !== false;
  },
};
