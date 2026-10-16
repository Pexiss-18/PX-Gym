import { Linking } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ExerciseGuideCard } from "../exercise-guide-card";
import { guiaDoExercicio } from "@/lib/guia-exercicios";

// O build ESM do lucide não passa pelo transform do Jest; ícone não importa aqui.
jest.mock("lucide-react-native", () => ({
  ChevronDown: () => null,
  ChevronUp: () => null,
  Play: () => null,
}));

const guia = guiaDoExercicio("supino-reto")!;

describe("ExerciseGuideCard", () => {
  it("mostra nível e músculos, com o passo a passo recolhido", async () => {
    await render(<ExerciseGuideCard nomeDoExercicio="Supino reto com barra" guia={guia} />);
    expect(screen.getByText("Iniciante")).toBeTruthy();
    expect(screen.getByText("Peito")).toBeTruthy();
    expect(screen.getByText("Também trabalha: Ombros, Tríceps")).toBeTruthy();
    expect(screen.queryByText(guia.passos[0])).toBeNull();
  });

  it("abre e fecha o passo a passo", async () => {
    await render(<ExerciseGuideCard nomeDoExercicio="Supino reto com barra" guia={guia} />);
    await fireEvent.press(screen.getByText("Passo a passo"));
    for (const passo of guia.passos) expect(screen.getByText(passo)).toBeTruthy();
    await fireEvent.press(screen.getByText("Passo a passo"));
    expect(screen.queryByText(guia.passos[0])).toBeNull();
  });

  it("o botão de vídeo abre a busca no YouTube", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await render(<ExerciseGuideCard nomeDoExercicio="Supino reto com barra" guia={guia} />);
    await fireEvent.press(screen.getByText("Ver vídeo no YouTube"));
    expect(openURL).toHaveBeenCalledWith(
      "https://www.youtube.com/results?search_query=como%20fazer%20Supino%20reto%20com%20barra",
    );
  });
});
