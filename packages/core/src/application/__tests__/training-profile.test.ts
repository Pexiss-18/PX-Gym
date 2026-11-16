import { SaveTrainingProfileUseCase, type TrainingProfileInput } from "../use-cases/training-profile";
import { FixedClock, InMemoryTrainingProfiles } from "../../testing/fakes";

const NOW = new Date("2026-11-13T12:00:00Z");

const VALIDO: TrainingProfileInput = {
  userId: "user-1",
  sex: "masculino",
  birthDate: "2001-05-20",
  heightCm: 178,
  goal: "hipertrofia",
  level: "intermediario",
  daysPerWeek: 4,
  minutesPerSession: 60,
  restrictions: "",
  sensitiveRegions: [],
};

function deps() {
  const profiles = new InMemoryTrainingProfiles();
  const useCase = new SaveTrainingProfileUseCase(profiles, new FixedClock(NOW));
  return { profiles, useCase };
}

describe("SaveTrainingProfileUseCase", () => {
  it("salva o perfil e mantém as preferências que a IA já aprendeu", async () => {
    const { profiles, useCase } = deps();
    await profiles.save({
      ...VALIDO,
      unavailableExercises: ["leg-press"],
      dislikedFoods: ["ovo"],
    });

    const r = await useCase.execute({
      ...VALIDO,
      daysPerWeek: 3,
      restrictions: "  dor no ombro direito  ",
      sensitiveRegions: ["ombro", "ombro", "joelho"],
    });

    expect(r.ok).toBe(true);
    expect(await profiles.get("user-1")).toEqual({
      ...VALIDO,
      daysPerWeek: 3,
      restrictions: "dor no ombro direito",
      sensitiveRegions: ["ombro", "joelho"],
      unavailableExercises: ["leg-press"],
      dislikedFoods: ["ovo"],
    });
  });

  it("perfil novo começa sem preferências aprendidas", async () => {
    const { profiles, useCase } = deps();
    await useCase.execute(VALIDO);
    expect(await profiles.get("user-1")).toMatchObject({ unavailableExercises: [], dislikedFoods: [] });
  });

  it.each([
    [{ daysPerWeek: 1 }, "dias"],
    [{ daysPerWeek: 7 }, "dias"],
    [{ heightCm: 110 }, "altura"],
    [{ heightCm: 240 }, "altura"],
    [{ minutesPerSession: 10 }, "minutos"],
    [{ minutesPerSession: 150 }, "minutos"],
    [{ birthDate: "2015-01-01" }, "idade"],
    [{ birthDate: "1930-01-01" }, "idade"],
    [{ birthDate: "20/05/2001" }, "nascimento"],
    [{ birthDate: "2001-02-30" }, "nascimento"],
  ])("recusa %o sem salvar", async (mudanca, trecho) => {
    const { profiles, useCase } = deps();

    const r = await useCase.execute({ ...VALIDO, ...mudanca });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro.tipo).toBe("dados-invalidos");
    expect(r.erro.mensagem).toContain(trecho);
    expect(await profiles.get("user-1")).toBeNull();
  });
});
