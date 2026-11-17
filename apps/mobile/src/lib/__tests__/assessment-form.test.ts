import { formularioDoPdf, medidaDoFormulario } from "../assessment-form";

describe("medidaDoFormulario", () => {
  it("casa nomes de laudo com os campos padrão", () => {
    expect(medidaDoFormulario("Tórax")).toBe("Peito");
    expect(medidaDoFormulario("Braço direito relaxado")).toBe("Braço");
    expect(medidaDoFormulario("ABDOMEN")).toBe("Abdômen");
    expect(medidaDoFormulario("Coxa proximal")).toBe("Coxa");
    expect(medidaDoFormulario("Antebraço")).toBeNull();
    expect(medidaDoFormulario("Pescoço")).toBeNull();
  });
});

describe("formularioDoPdf", () => {
  it("preenche com vírgula; repetida e sem par viram linhas extras", () => {
    const f = formularioDoPdf({
      weightKg: 81.4,
      bodyFatPct: 18.7,
      muscleMassKg: null,
      measurements: [
        { label: "Torax", valueCm: 101 },
        { label: "Braço direito", valueCm: 35.5 },
        { label: "Braço esquerdo", valueCm: 35 },
        { label: "Pescoço", valueCm: 39 },
      ],
      assessmentDate: "2026-11-12",
      notes: null,
    });
    expect(f).toEqual({
      peso: "81,4",
      gordura: "18,7",
      musculo: "",
      data: "2026-11-12",
      observacoes: "",
      medidas: { Peito: "101", Braço: "35,5", "Braço esquerdo": "35", Pescoço: "39" },
      extras: ["Braço esquerdo", "Pescoço"],
    });
  });
});
