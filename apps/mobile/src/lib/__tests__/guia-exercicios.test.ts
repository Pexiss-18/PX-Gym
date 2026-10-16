import { EXERCICIOS } from "../../../../../supabase/functions/_shared/plano/exercicios";
import { guiaDoExercicio, linkDoVideo } from "../guia-exercicios";
import { GUIAS } from "../guia-exercicios.dados";

describe("guia de execução", () => {
  it("cobre todo exercício que a IA pode escolher", () => {
    const semGuia = EXERCICIOS.filter((e) => !guiaDoExercicio(e.id)).map((e) => e.id);
    expect(semGuia).toEqual([]);
  });

  it("não guarda guia de exercício que saiu do catálogo", () => {
    const ids = new Set(EXERCICIOS.map((e) => e.id));
    expect(Object.keys(GUIAS).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("todo guia ensina algo: passos, músculo principal", () => {
    for (const [id, guia] of Object.entries(GUIAS)) {
      expect({ id, passos: guia.passos.length > 1 }).toEqual({ id, passos: true });
      expect({ id, musculo: guia.musculosPrimarios.length > 0 }).toEqual({ id, musculo: true });
    }
  });

  it("exercício desconhecido não tem guia", () => {
    expect(guiaDoExercicio("nao-existe")).toBeNull();
  });

  it("busca o vídeo no YouTube pelo nome, com a busca codificada", () => {
    expect(linkDoVideo("Supino reto com barra")).toBe(
      "https://www.youtube.com/results?search_query=como%20fazer%20Supino%20reto%20com%20barra",
    );
  });
});
