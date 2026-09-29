import { SvgXml } from "react-native-svg";
import { base64ParaSvg } from "./assinatura-svg";

/** Mostra uma assinatura salva (data URI SVG) sobre fundo claro. */
export function Rubrica({ dataUri, largura = 96, altura = 40 }: { dataUri: string; largura?: number; altura?: number }) {
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
  return <SvgXml xml={base64ParaSvg(base64)} width={largura} height={altura} />;
}
