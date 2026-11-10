export type AssessmentStatus =
  | "processing"
  | "pending_review"
  | "reviewed"
  | "error";

export type AssessmentMeasurement = {
  label: string;
  valueCm: number;
};

/** Dados estruturados extraídos do PDF pela IA (espelha o schema zod do web). */
export type ExtractedAssessment = {
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  measurements: AssessmentMeasurement[];
  assessmentDate: string | null;
  notes: string | null;
};

/** De onde veio a avaliação: PDF lido pela IA ou digitada pela pessoa. */
export type AssessmentSource = "pdf" | "manual";

export type BodyAssessment = {
  id: string;
  userId: string;
  /** Caminho do PDF no Storage; null na avaliação digitada no app. */
  pdfPath: string | null;
  source: AssessmentSource;
  status: AssessmentStatus;
  extracted: ExtractedAssessment | null;
  errorMessage: string | null;
  createdAt: Date;
};
