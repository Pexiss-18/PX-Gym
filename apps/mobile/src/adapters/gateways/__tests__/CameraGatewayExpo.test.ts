import { Camera, type CameraView } from "expo-camera";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { CameraGatewayExpo } from "../CameraGatewayExpo";

jest.mock("expo-camera", () => ({
  Camera: {
    getCameraPermissionsAsync: jest.fn(),
    requestCameraPermissionsAsync: jest.fn(),
  },
}));

jest.mock("expo-file-system", () => {
  const remover = jest.fn();
  return { File: jest.fn(() => ({ delete: remover })), __remover: remover };
});

jest.mock("expo-image-manipulator", () => {
  const salvar = jest.fn(async () => ({ uri: "file:///ajustada.jpg", width: 1080, height: 1920 }));
  const contexto = {
    crop: jest.fn(() => contexto),
    resize: jest.fn(() => contexto),
    renderAsync: jest.fn(async () => ({ saveAsync: salvar })),
  };
  return {
    ImageManipulator: { manipulate: jest.fn(() => contexto) },
    SaveFormat: { JPEG: "jpeg" },
    __contexto: contexto,
    __salvar: salvar,
  };
});

const { __contexto: contexto, __salvar: salvar } = jest.requireMock("expo-image-manipulator");
const { __remover: remover } = jest.requireMock("expo-file-system");

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

  it("captura sem perda e devolve só o que o domínio usa", async () => {
    const view = viewFalsa({ uri: "file:///original.jpg", width: 3024, height: 4032, base64: "xyz" });
    const foto = await new CameraGatewayExpo(() => view).capturar();
    expect(view.takePictureAsync).toHaveBeenCalledWith({ quality: 1 });
    expect(foto).toEqual({ uri: "file:///ajustada.jpg", largura: 1080, altura: 1920 });
  });

  it("recorta o 9:16 centralizado calculado pelo domínio", async () => {
    const view = viewFalsa({ uri: "file:///original.jpg", width: 3024, height: 4032 });
    await new CameraGatewayExpo(() => view).capturar();
    expect(ImageManipulator.manipulate).toHaveBeenCalledWith("file:///original.jpg");
    expect(contexto.crop).toHaveBeenCalledWith({ originX: 378, originY: 0, width: 2268, height: 4032 });
  });

  it("redimensiona pra 1080×1920 e salva em JPEG 92% uma única vez", async () => {
    const view = viewFalsa({ uri: "file:///original.jpg", width: 3024, height: 4032 });
    await new CameraGatewayExpo(() => view).capturar();
    expect(contexto.resize).toHaveBeenCalledWith({ width: 1080, height: 1920 });
    expect(salvar).toHaveBeenCalledTimes(1);
    expect(salvar).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.92 });
  });

  it("apaga o original do cache depois do ajuste", async () => {
    const view = viewFalsa({ uri: "file:///original.jpg", width: 3024, height: 4032 });
    await new CameraGatewayExpo(() => view).capturar();
    expect(File).toHaveBeenCalledWith("file:///original.jpg");
    expect(remover).toHaveBeenCalledTimes(1);
  });

  it("falha ao apagar o original não derruba a captura", async () => {
    remover.mockImplementationOnce(() => {
      throw new Error("sem permissão");
    });
    const view = viewFalsa({ uri: "file:///original.jpg", width: 3024, height: 4032 });
    await expect(new CameraGatewayExpo(() => view).capturar()).resolves.toMatchObject({ largura: 1080 });
  });

  it("câmera ainda não montada", async () => {
    await expect(new CameraGatewayExpo(() => null).capturar()).rejects.toThrow(/não está pronta/);
  });

  it("câmera montada mas sem foto", async () => {
    await expect(new CameraGatewayExpo(() => viewFalsa(undefined)).capturar()).rejects.toThrow(/não devolveu/);
  });
});
