import NetInfo from "@react-native-community/netinfo";
import { netInfoConnectivity } from "../system";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "uuid" }));

const fetchState = NetInfo.fetch as jest.Mock;

describe("netInfoConnectivity", () => {
  it.each([
    [{ isConnected: true, isInternetReachable: true }, true],
    // NetInfo ainda sondando: não trava o sync por um "talvez"
    [{ isConnected: true, isInternetReachable: null }, true],
    // Wi-Fi da academia sem internet de fato
    [{ isConnected: true, isInternetReachable: false }, false],
    // modo avião
    [{ isConnected: false, isInternetReachable: false }, false],
    [{ isConnected: null, isInternetReachable: null }, false],
  ])("%j → online=%p", async (state, expected) => {
    fetchState.mockResolvedValue(state);
    expect(await netInfoConnectivity.isOnline()).toBe(expected);
  });
});
