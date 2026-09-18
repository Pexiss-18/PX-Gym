import * as Location from "expo-location";
import { InvalidValueError, LocationUnavailableError } from "@px/core";
import { ExpoLocationGateway } from "../location";

// GPS nunca roda de verdade em teste: o módulo nativo vira este mock.
jest.mock("expo-location", () => ({
  PermissionStatus: {
    GRANTED: "granted",
    UNDETERMINED: "undetermined",
    DENIED: "denied",
  },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));

const mocked = Location as jest.Mocked<typeof Location>;

function permission(
  status: "granted" | "undetermined" | "denied",
  canAskAgain = true,
) {
  return {
    status,
    granted: status === "granted",
    canAskAgain,
    expires: "never",
  } as unknown as Location.LocationPermissionResponse;
}

function position(latitude: number, longitude: number, timestamp = 1) {
  return {
    coords: { latitude, longitude },
    timestamp,
  } as unknown as Location.LocationObject;
}

beforeEach(() => jest.resetAllMocks());

describe("ExpoLocationGateway.permission", () => {
  it.each([
    [permission("granted"), "granted"],
    [permission("undetermined"), "undetermined"],
    [permission("denied", true), "denied"],
    [permission("denied", false), "blocked"],
  ])("traduz a resposta do Expo (%#)", async (response, expected) => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(response);
    expect(await new ExpoLocationGateway().permission()).toBe(expected);
  });

  it("requestPermission abre o diálogo e traduz a resposta", async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(
      permission("granted"),
    );
    expect(await new ExpoLocationGateway().requestPermission()).toBe("granted");
    expect(mocked.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

describe("ExpoLocationGateway.currentPosition", () => {
  it("usa o fix atual com precisão balanceada", async () => {
    mocked.getCurrentPositionAsync.mockResolvedValue(
      position(-19.92, -43.94, 42),
    );

    expect(await new ExpoLocationGateway().currentPosition()).toEqual({
      latitude: -19.92,
      longitude: -43.94,
      timestamp: 42,
    });
    expect(mocked.getCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
    expect(mocked.getLastKnownPositionAsync).not.toHaveBeenCalled();
  });

  it("fix novo não sai (GPS frio/emulador): cai pra última posição conhecida", async () => {
    mocked.getCurrentPositionAsync.mockRejectedValue(
      new Error("Current location is unavailable"),
    );
    mocked.getLastKnownPositionAsync.mockResolvedValue(position(-19.9, -43.9));

    expect(await new ExpoLocationGateway().currentPosition()).toMatchObject({
      latitude: -19.9,
      longitude: -43.9,
    });
  });

  it("sem fix e sem última conhecida: LocationUnavailableError", async () => {
    mocked.getCurrentPositionAsync.mockRejectedValue(new Error("no fix"));
    mocked.getLastKnownPositionAsync.mockResolvedValue(null);

    await expect(
      new ExpoLocationGateway().currentPosition(),
    ).rejects.toBeInstanceOf(LocationUnavailableError);
  });

  it("última conhecida também falhando: LocationUnavailableError", async () => {
    mocked.getCurrentPositionAsync.mockRejectedValue(new Error("no fix"));
    mocked.getLastKnownPositionAsync.mockRejectedValue(new Error("off"));

    await expect(
      new ExpoLocationGateway().currentPosition(),
    ).rejects.toBeInstanceOf(LocationUnavailableError);
  });

  it("coordenada absurda do sensor não entra no domínio", async () => {
    mocked.getCurrentPositionAsync.mockResolvedValue(position(123, 0));

    await expect(
      new ExpoLocationGateway().currentPosition(),
    ).rejects.toBeInstanceOf(InvalidValueError);
  });
});
