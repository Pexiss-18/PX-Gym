"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inputFieldClass } from "@/lib/utils";
import type { ExtractedAssessment } from "@/lib/schemas/assessment";

const GOAL_OPTIONS = ["Hipertrofia", "Emagrecimento", "Manutenção", "Performance esportiva", "Saúde geral"];

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ReviewForm({
  data,
  onChange,
  goal,
  onGoalChange,
}: {
  data: ExtractedAssessment;
  onChange: (data: ExtractedAssessment) => void;
  goal: string;
  onGoalChange: (goal: string) => void;
}) {
  function updateMeasurement(index: number, field: "label" | "valueCm", value: string) {
    const measurements = data.measurements.map((m, i) =>
      i === index ? { ...m, [field]: field === "valueCm" ? Number(value) || 0 : value } : m,
    );
    onChange({ ...data, measurements });
  }

  function removeMeasurement(index: number) {
    onChange({ ...data, measurements: data.measurements.filter((_, i) => i !== index) });
  }

  function addMeasurement() {
    onChange({ ...data, measurements: [...data.measurements, { label: "", valueCm: 0 }] });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="glass rounded-[1.75rem] p-6">
        <p className="text-sm font-medium">Composição corporal</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="weightKg">Peso (kg)</Label>
            <Input
              id="weightKg"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={data.weightKg ?? ""}
              onChange={(e) => onChange({ ...data, weightKg: numberOrNull(e.target.value) })}
              className={inputFieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bodyFatPct">Gordura corporal (%)</Label>
            <Input
              id="bodyFatPct"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={data.bodyFatPct ?? ""}
              onChange={(e) => onChange({ ...data, bodyFatPct: numberOrNull(e.target.value) })}
              className={inputFieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="muscleMassKg">Massa magra (kg)</Label>
            <Input
              id="muscleMassKg"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={data.muscleMassKg ?? ""}
              onChange={(e) => onChange({ ...data, muscleMassKg: numberOrNull(e.target.value) })}
              className={inputFieldClass}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="assessmentDate">Data da avaliação</Label>
          <Input
            id="assessmentDate"
            type="date"
            value={data.assessmentDate ?? ""}
            onChange={(e) => onChange({ ...data, assessmentDate: e.target.value || null })}
            className={`${inputFieldClass} max-w-[200px]`}
          />
        </div>
      </div>

      <div className="glass rounded-[1.75rem] p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Medidas</p>
          <button
            type="button"
            onClick={addMeasurement}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Adicionar
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          {data.measurements.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma medida encontrada. Adicione manualmente se quiser.</p>
          )}
          {data.measurements.map((measurement, index) => (
            <div key={index} className="flex items-center gap-2.5">
              <Input
                value={measurement.label}
                onChange={(e) => updateMeasurement(index, "label", e.target.value)}
                placeholder="Ex: Cintura"
                className={`${inputFieldClass} flex-1`}
              />
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={measurement.valueCm}
                onChange={(e) => updateMeasurement(index, "valueCm", e.target.value)}
                className={`${inputFieldClass} w-24`}
              />
              <span className="text-xs text-muted-foreground">cm</span>
              <button
                type="button"
                onClick={() => removeMeasurement(index)}
                aria-label="Remover medida"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-[oklch(0.72_0.17_32)]"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-[1.75rem] p-6">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          rows={3}
          value={data.notes ?? ""}
          onChange={(e) => onChange({ ...data, notes: e.target.value || null })}
          className="mt-1.5 rounded-xl border-white/10 bg-white/[0.04] text-[15px] focus-visible:border-primary/40 focus-visible:ring-primary/30"
        />
      </div>

      <div className="glass rounded-[1.75rem] p-6">
        <Label htmlFor="goal">Objetivo</Label>
        <Select value={goal} onValueChange={onGoalChange}>
          <SelectTrigger id="goal" className="mt-1.5 h-11 w-full rounded-xl border-white/10 bg-white/[0.04]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GOAL_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-muted-foreground">
          Usado pela IA para calibrar a meta de macros e micros.
        </p>
      </div>
    </div>
  );
}
