import type {
  AssessmentMeasurement,
  BodyAssessment,
} from "../../domain/entities/body-assessment";
import type { AssessmentRepository, Clock, IdGenerator } from "../../domain/contracts";
import { InvalidValueError } from "../../domain/errors";
import { falhaDoErro, sucesso, type Resultado } from "./resultado";

export type ManualAssessmentInput = {
  userId: string;
  weightKg: number;
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  /** Linhas em branco (sem nome ou sem valor) são ignoradas. */
  measurements?: { label: string; valueCm: number | null }[];
  /** AAAA-MM-DD; sem ela, vale a data de hoje. */
  assessmentDate?: string | null;
  notes?: string | null;
};

function dataLocal(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function faixa(valor: number, min: number, max: number, mensagem: string): number {
  if (!Number.isFinite(valor) || valor < min || valor > max) {
    throw new InvalidValueError(mensagem);
  }
  return valor;
}

function medidas(linhas: ManualAssessmentInput["measurements"] = []): AssessmentMeasurement[] {
  return linhas
    .map((linha) => ({ label: linha.label.trim(), valueCm: linha.valueCm }))
    .filter((linha): linha is AssessmentMeasurement => linha.label !== "" && linha.valueCm !== null)
    .map((linha) => ({
      label: linha.label,
      valueCm: faixa(linha.valueCm, 10, 250, `${linha.label}: informe um valor entre 10 e 250 cm.`),
    }));
}

/**
 * Avaliação digitada no app — quem fez a avaliação com um personal e não tem
 * PDF. Os números já vêm conferidos pela pessoa, então ela nasce revisada e
 * serve direto pra gerar o treino e a dieta.
 */
export class RegisterManualAssessmentUseCase {
  constructor(
    private readonly assessments: AssessmentRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: ManualAssessmentInput): Promise<Resultado<BodyAssessment>> {
    try {
      const agora = this.clock.now();
      const hoje = dataLocal(agora);

      const weightKg = faixa(input.weightKg, 30, 300, "Informe um peso entre 30 e 300 kg.");
      const bodyFatPct =
        input.bodyFatPct == null
          ? null
          : faixa(input.bodyFatPct, 2, 70, "O percentual de gordura precisa estar entre 2% e 70%.");
      const muscleMassKg =
        input.muscleMassKg == null
          ? null
          : faixa(input.muscleMassKg, 1, weightKg, "A massa muscular precisa ser maior que zero e menor que o peso.");

      const assessmentDate = input.assessmentDate?.trim() || hoje;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(assessmentDate)) {
        throw new InvalidValueError("Informe a data no formato AAAA-MM-DD.");
      }
      if (assessmentDate > hoje) {
        throw new InvalidValueError("A data da avaliação não pode estar no futuro.");
      }

      const assessment: BodyAssessment = {
        id: this.ids.next(),
        userId: input.userId,
        pdfPath: null,
        source: "manual",
        status: "reviewed",
        extracted: {
          weightKg,
          bodyFatPct,
          muscleMassKg,
          measurements: medidas(input.measurements),
          assessmentDate,
          notes: input.notes?.trim() || null,
        },
        errorMessage: null,
        createdAt: agora,
      };

      return sucesso(await this.assessments.createManual(assessment));
    } catch (erro) {
      return falhaDoErro(erro);
    }
  }
}
