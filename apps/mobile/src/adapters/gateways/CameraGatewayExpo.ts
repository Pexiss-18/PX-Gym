import { Camera, type CameraView, type PermissionResponse } from "expo-camera";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import {
  FORMATO_FOTO_PROGRESSO,
  recorteRetrato,
  type CameraGateway,
  type FotoCapturada,
  type PermissaoCamera,
} from "@px/core";

type Formato = { largura: number; altura: number; qualidade: number };

function traduzir(resposta: PermissionResponse): PermissaoCamera {
  if (resposta.granted) return "concedida";
  return resposta.canAskAgain ? "negada" : "bloqueada";
}

/** Original da câmera no cache: depois do ajuste ele não serve mais. */
function descartar(uri: string) {
  try {
    new File(uri).delete();
  } catch {
    // o sistema limpa o cache sozinho; não vale derrubar a captura por isso
  }
}

/**
 * CameraGateway sobre o expo-camera. A captura precisa do <CameraView>
 * montado na tela, então o gateway recebe uma função que devolve a ref —
 * a tela só desenha o preview; quem fala com a câmera é o gateway.
 *
 * Ajuste da foto: captura sem perda (qualidade 1), recorta o maior 9:16
 * centralizado (regra do domínio), redimensiona pra 1080×1920 e salva em
 * JPEG uma única vez, com a qualidade do formato (92%).
 */
export class CameraGatewayExpo implements CameraGateway {
  constructor(
    private readonly camera: () => CameraView | null,
    private readonly formato: Formato = FORMATO_FOTO_PROGRESSO,
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
    const original = await view.takePictureAsync({ quality: 1 });
    if (!original) throw new Error("A câmera não devolveu a foto.");

    const recorte = recorteRetrato(original.width, original.height);
    const imagem = await ImageManipulator.manipulate(original.uri)
      .crop({
        originX: recorte.x,
        originY: recorte.y,
        width: recorte.largura,
        height: recorte.altura,
      })
      .resize({ width: this.formato.largura, height: this.formato.altura })
      .renderAsync();
    const ajustada = await imagem.saveAsync({
      format: SaveFormat.JPEG,
      compress: this.formato.qualidade,
    });

    descartar(original.uri);
    return { uri: ajustada.uri, largura: ajustada.width, altura: ajustada.height };
  }
}
