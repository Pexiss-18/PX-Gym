import { Camera, type CameraView, type PermissionResponse } from "expo-camera";
import type { CameraGateway, FotoCapturada, PermissaoCamera } from "@px/core";

function traduzir(resposta: PermissionResponse): PermissaoCamera {
  if (resposta.granted) return "concedida";
  return resposta.canAskAgain ? "negada" : "bloqueada";
}

/**
 * CameraGateway sobre o expo-camera. A captura precisa do <CameraView>
 * montado na tela, então o gateway recebe uma função que devolve a ref —
 * a tela só desenha o preview; quem fala com a câmera é o gateway.
 */
export class CameraGatewayExpo implements CameraGateway {
  constructor(
    private readonly camera: () => CameraView | null,
    private readonly qualidade = 0.85,
  ) {}

  async permissao(): Promise<PermissaoCamera> {
    return traduzir(await Camera.getCameraPermissionsAsync());
  }

  async solicitarPermissao(): Promise<PermissaoCamera> {
    return traduzir(await Camera.requestCameraPermissionsAsync());
  }

  async capturar(): Promise<FotoCapturada> {
    const view = this.camera();
    if (!view) throw new Error("A câmera ainda não está pronta.");
    const foto = await view.takePictureAsync({ quality: this.qualidade });
    if (!foto) throw new Error("A câmera não devolveu a foto.");
    return { uri: foto.uri, largura: foto.width, altura: foto.height };
  }
}
