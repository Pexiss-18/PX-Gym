import { Camera, type CameraView } from "expo-camera";
import { CameraGatewayExpo } from "../CameraGatewayExpo";

jest.mock("expo-camera", () => ({
  Camera: {
    getCameraPermissionsAsync: jest.fn(),
    requestCameraPermissionsAsync: jest.fn(),
  },
}));

const getPerm = Camera.getCameraPermissionsAsync as jest.Mock;
const requestPerm = Camera.requestCameraPermissionsAsync as jest.Mock;

const resposta = (granted: boolean, canAskAgain = true) => ({
  granted,
  canAskAgain,
  status: granted ? "granted" : "denied",
  expires: "never",
});

function viewFalsa(foto: unknown) {
  return { takePictureAsync: jest.fn(async () => foto) } as unknown as CameraView;
}

beforeEach(() => jest.clearAllMocks());

describe("CameraGatewayExpo", () => {
  it.each([
    [resposta(true), "concedida"],
    [resposta(false, true), "negada"],
    [resposta(false, false), "bloqueada"],
  ])("traduz a permissão do expo-camera pro domínio", async (r, esperado) => {
    getPerm.mockResolvedValue(r);
    expect(await new CameraGatewayExpo(() => null).permissao()).toBe(esperado);
  });

  it("solicitar abre o diálogo do sistema", async () => {
    requestPerm.mockResolvedValue(resposta(true));
    expect(await new CameraGatewayExpo(() => null).solicitarPermissao()).toBe("concedida");
    expect(requestPerm).toHaveBeenCalledTimes(1);
  });

  it("captura pela ref do <CameraView> e devolve só o que o domínio usa", async () => {
    const view = viewFalsa({ uri: "file:///foto.jpg", width: 1080, height: 1440, base64: "xyz" });
    const foto = await new CameraGatewayExpo(() => view, 0.7).capturar();
    expect(foto).toEqual({ uri: "file:///foto.jpg", largura: 1080, altura: 1440 });
    expect(view.takePictureAsync).toHaveBeenCalledWith({ quality: 0.7 });
  });

  it("câmera ainda não montada", async () => {
    await expect(new CameraGatewayExpo(() => null).capturar()).rejects.toThrow(/não está pronta/);
  });

  it("câmera montada mas sem foto", async () => {
    await expect(new CameraGatewayExpo(() => viewFalsa(undefined)).capturar()).rejects.toThrow(/não devolveu/);
  });
});
