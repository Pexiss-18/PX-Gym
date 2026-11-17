import { Linking } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { PhotoViewer, type ViewerPhoto } from "../photo-viewer";

// O build ESM do lucide não passa pelo transform do Jest; ícone não importa aqui.
jest.mock("lucide-react-native", () => ({
  Map: () => null,
  MapPin: () => null,
  Trash2: () => null,
  User: () => null,
  X: () => null,
}));

jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

const fotos: ViewerPhoto[] = [
  {
    id: "f3",
    localUri: "file:///f3.jpg",
    takenAt: new Date(2026, 10, 3, 9, 30),
    syncStatus: "pending",
    location: { latitude: -19.92453, longitude: -43.93518 },
  },
  { id: "f2", localUri: "file:///f2.jpg", takenAt: new Date(2026, 9, 27, 8, 0), syncStatus: "synced" },
  { id: "f1", localUri: "file:///f1.jpg", takenAt: new Date(2026, 9, 20, 7, 15), syncStatus: "synced" },
];

function abrir(index: number | null, extra: Partial<Parameters<typeof PhotoViewer>[0]> = {}) {
  const onClose = jest.fn();
  const onDelete = jest.fn();
  return {
    onClose,
    onDelete,
    tela: render(
      <PhotoViewer photos={fotos} index={index} onClose={onClose} onDelete={onDelete} {...extra} />,
    ),
  };
}

describe("PhotoViewer", () => {
  it("fechado (index null) não mostra nada", async () => {
    await abrir(null).tela;
    expect(screen.queryByLabelText("Fechar foto")).toBeNull();
  });

  it("abre na foto tocada, com a posição na galeria, a data e o status de envio", async () => {
    await abrir(1).tela;
    expect(screen.getByText("2 de 3")).toBeTruthy();
    expect(screen.getByText("27 de outubro de 2026")).toBeTruthy();
    expect(screen.getByText("Na nuvem")).toBeTruthy();
  });

  it("deslizar troca a foto mostrada no cabeçalho", async () => {
    await abrir(0).tela;
    expect(screen.getByText("Aguardando envio")).toBeTruthy();

    await fireEvent(screen.getByTestId("fotos-paginas"), "momentumScrollEnd", {
      nativeEvent: { contentOffset: { x: 2 * 390, y: 0 }, layoutMeasurement: { width: 390, height: 844 } },
    });

    expect(screen.getByText("3 de 3")).toBeTruthy();
    expect(screen.getByText("20 de outubro de 2026")).toBeTruthy();
  });

  it("fechar chama onClose", async () => {
    const { onClose, tela } = abrir(0);
    await tela;
    await fireEvent.press(screen.getByLabelText("Fechar foto"));
    expect(onClose).toHaveBeenCalled();
  });

  it("apagar entrega a foto que está na tela", async () => {
    const { onDelete, tela } = abrir(2);
    await tela;
    await fireEvent.press(screen.getByLabelText("Apagar foto"));
    expect(onDelete).toHaveBeenCalledWith(fotos[2]);
  });

  it("mostra onde a foto foi tirada, em graus com hemisfério", async () => {
    await abrir(0).tela;
    expect(screen.getByText("19,9245° S · 43,9352° O")).toBeTruthy();
  });

  it("'Ver no mapa' abre o app de mapas no ponto da foto", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await abrir(0).tela;
    await fireEvent.press(screen.getByLabelText("Ver no mapa onde a foto foi tirada"));
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining("-19.92453,-43.93518"));
  });

  it("foto sem posição (permissão negada ou sem sinal) avisa e não oferece mapa", async () => {
    await abrir(1).tela;
    expect(screen.getByText("Sem localização")).toBeTruthy();
    expect(screen.getByText("Sem permissão ou sem sinal do GPS")).toBeTruthy();
    expect(screen.queryByLabelText("Ver no mapa onde a foto foi tirada")).toBeNull();
  });

  it("index além do fim (a última foto acabou de ser apagada) mostra a última que sobrou", async () => {
    await abrir(7).tela;
    expect(screen.getByText("3 de 3")).toBeTruthy();
  });
});
