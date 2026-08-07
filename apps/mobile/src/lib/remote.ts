import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { BodyAssessment, NutritionPlan } from "@px/core";
import {
  SupabaseAssessmentRepository,
  SupabaseNutritionPlanRepository,
} from "@px/db";
import { supabase } from "./supabase";
import { useAuth } from "./auth-context";

/*
 * Dados remotos (Supabase) com refetch a cada focus da tela — o usuário que
 * enviou um PDF no web vê a avaliação aparecer ao voltar pra tela, sem
 * pull-to-refresh. Estados explícitos pra UI: loading | error | ready.
 */

export const assessmentRepository = new SupabaseAssessmentRepository(supabase);
export const nutritionPlanRepository = new SupabaseNutritionPlanRepository(
  supabase,
);

export type Remote<T> =
  | { status: "loading"; data: null }
  | { status: "error"; data: null }
  | { status: "ready"; data: T };

function useRemote<T>(fetcher: (userId: string) => Promise<T>): Remote<T> {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [state, setState] = useState<Remote<T>>({
    status: "loading",
    data: null,
  });

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      fetcher(userId)
        .then((data) => {
          if (active) setState({ status: "ready", data });
        })
        .catch(() => {
          if (active) setState({ status: "error", data: null });
        });
      return () => {
        active = false;
      };
    }, [userId, fetcher]),
  );

  return state;
}

const fetchAssessments = (userId: string) =>
  assessmentRepository.listByUser(userId);

const fetchLatestPlan = (userId: string) =>
  nutritionPlanRepository.latestForUser(userId);

export function useAssessments(): Remote<BodyAssessment[]> {
  return useRemote(fetchAssessments);
}

export function useLatestPlan(): Remote<NutritionPlan | null> {
  return useRemote(fetchLatestPlan);
}

export type BodyMetrics = {
  latest: BodyAssessment | null;
  previous: BodyAssessment | null;
};

const fetchBodyMetrics = async (userId: string): Promise<BodyMetrics> => {
  const all = await assessmentRepository.listByUser(userId);
  // Só avaliações com dados extraídos servem de métrica (reviewed primeiro,
  // pending_review vale enquanto a revisão não sai).
  const usable = all.filter(
    (a) =>
      a.extracted && (a.status === "reviewed" || a.status === "pending_review"),
  );
  return { latest: usable[0] ?? null, previous: usable[1] ?? null };
};

export function useBodyMetrics(): Remote<BodyMetrics> {
  return useRemote(fetchBodyMetrics);
}
