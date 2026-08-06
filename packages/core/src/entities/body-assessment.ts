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

export type BodyAssessment = {
  id: string;
  userId: string;
  pdfPath: string;
  status: AssessmentStatus;
  extracted: ExtractedAssessment | null;
  errorMessage: string | null;
  createdAt: Date;
};
