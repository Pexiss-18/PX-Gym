import { useCallback, useState } from "react";
import type { NutritionGenerationOutcome, NutritionPlan, Resultado } from "@px/core";
import { useAuth } from "@/adapters/hooks/useAuth";
import { toGenerationError, type GenerationError } from "@/components/generation-feedback";
import { generateDietPlanUseCase } from "./plans";

/**
 * Ações da dieta gerada por IA. `busy` enquanto a Edge Function trabalha
 * (pode levar até um minuto); `error` com a mensagem pronta; `generated` é a
 * dieta que acabou de sair, pra tela trocar sem esperar recarregar.
 */
export function useDietGeneration() {
  const { sessao } = useAuth();
  const userId = sessao?.usuario.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<GenerationError | null>(null);
  const [generated, setGenerated] = useState<NutritionPlan | null>(null);
  const [queuedGenerationId, setQueuedGenerationId] = useState<string | null>(null);

  const run = useCallback(
    async (call: () => Promise<Resultado<NutritionGenerationOutcome>>): Promise<boolean> => {
      if (!userId || busy) return false;
      setBusy(true);
      setError(null);
      try {
        const r = await call();
        if (!r.ok) {
          setError(toGenerationError(r.erro.mensagem));
          return false;
        }
        if (r.valor.status === "done") {
          setGenerated(r.valor.plan);
          setQueuedGenerationId(null);
        } else {
          setQueuedGenerationId(r.valor.generationId);
        }
        return true;
      } finally {
        setBusy(false);
      }
    },
    [userId, busy],
  );

  return {
    busy,
    error,
    generated,
    queuedGenerationId,
    clearError: () => setError(null),
    generate: () => run(() => generateDietPlanUseCase.generate(userId!)),
    requestChange: (feedback: string) => run(() => generateDietPlanUseCase.requestChange(userId!, feedback)),
    resume: (generationId: string) => run(() => generateDietPlanUseCase.resume(userId!, generationId)),
  };
}
