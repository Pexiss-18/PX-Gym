import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { z } from "zod";
import { provedoresGemini } from "../_shared/ia/gemini.ts";
import { ErroDeCota } from "../_shared/ia/provedor.ts";
import {
  avaliacaoSchema,
  dietaSchema,
  type Perfil,
  perfilDoBanco,
} from "../_shared/plano/esquema.ts";
import { gerarPlano } from "../_shared/plano/gerar-plano.ts";
import type { Revisao } from "../_shared/plano/prompt.ts";
import { juntarAlimentos, type Treino } from "../_shared/plano/regras.ts";

/** Pedidos por usuário em 24h (os que deram erro não contam). */
const LIMITE_DIARIO = 8;
/** Planos gerados do zero a partir da mesma avaliação. */
const LIMITE_DE_PLANOS_POR_AVALIACAO = 2;
/** Pedidos de mudança atendidos sobre a mesma avaliação. */
const LIMITE_DE_MUDANCAS_POR_AVALIACAO = 5;

const corpoSchema = z.union([
  z.object({ assessmentId: z.uuid() }),
  // Muda algo no plano ativo: "não tem leg press", "não gosto de ovo"...
  z.object({ feedback: z.string().trim().min(3).max(500) }),
  // Retoma um pedido que ficou na fila porque a cota da IA tinha acabado.
  z.object({ generationId: z.uuid() }),
]);

type Tipo = "initial" | "revision";

function falha(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/**
 * POST /generate-plan
 *   { assessmentId }  → gera treino e dieta da avaliação revisada
 *   { feedback }      → refaz o plano ativo com a mudança pedida
 *   { generationId }  → tenta de novo um pedido que ficou na fila
 *
 * O perfil (objetivo, dias, nível, restrições...) vem de user_profiles.
 * 200 { status: "done", ... }  | 202 { status: "queued", generationId }
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return falha(405, "Use POST.");

    const chave = Deno.env.get("GEMINI_API_KEY");
    if (!chave) return falha(500, "GEMINI_API_KEY não configurada no servidor.");

    const corpo = corpoSchema.safeParse(await req.json().catch(() => null));
    if (!corpo.success) return falha(400, "Dados do pedido inválidos.");
    const pedido = corpo.data;

    const userId = ctx.userClaims!.id;
    const admin = ctx.supabaseAdmin;
    // Cliente do usuário: o RLS garante que tudo que ele lê é dele.
    const doUsuario = ctx.supabase;

    const { data: perfilRow } = await doUsuario
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!perfilRow) return falha(422, "Preencha seu perfil antes de gerar o plano.");
    let perfil: Perfil;
    try {
      perfil = perfilDoBanco(perfilRow, new Date());
    } catch {
      return falha(422, "Seu perfil está incompleto ou com dados inválidos.");
    }

    let generationId = "";
    let assessmentId = "";
    let tipo: Tipo = "initial";
    let feedback: string | null = null;

    if ("generationId" in pedido) {
      // Só o dono retoma, e só um pedido que esteja na fila.
      const { data: retomado, error } = await admin
        .from("plan_generations")
        .update({ status: "generating" })
        .eq("id", pedido.generationId)
        .eq("user_id", userId)
        .eq("status", "queued")
        .select("id, assessment_id, kind, feedback")
        .maybeSingle();
      if (error) return falha(500, error.message);
      if (!retomado) return falha(409, "Esse pedido não está na fila.");
      generationId = retomado.id;
      assessmentId = retomado.assessment_id;
      tipo = retomado.kind;
      feedback = retomado.feedback;
    } else if ("feedback" in pedido) {
      tipo = "revision";
      feedback = pedido.feedback;
    } else {
      assessmentId = pedido.assessmentId;
    }

    let revisao: Revisao | undefined;
    if (tipo === "revision") {
      const { data: treinoAtivo } = await doUsuario
        .from("workout_plans")
        .select("assessment_id, generation_id, name, rationale, days")
        .eq("user_id", userId)
        .eq("active", true)
        .maybeSingle();
      if (!treinoAtivo) return falha(404, "Gere um plano antes de pedir mudanças.");
      const { data: dietaAtual } = await doUsuario
        .from("nutrition_plans")
        .select("calories_target, macros, micros, diet_guidance")
        .eq("generation_id", treinoAtivo.generation_id)
        .maybeSingle();
      const dieta = dietaSchema.safeParse({
        caloriesTarget: dietaAtual?.calories_target,
        macros: dietaAtual?.macros,
        micros: dietaAtual?.micros,
        dietGuidance: dietaAtual?.diet_guidance,
      });
      if (!dieta.success) return falha(404, "Gere um plano antes de pedir mudanças.");

      assessmentId = treinoAtivo.assessment_id;
      revisao = {
        pedido: feedback ?? "",
        planoAtual: {
          nutrition: dieta.data,
          workout: {
            name: treinoAtivo.name,
            rationale: treinoAtivo.rationale,
            days: treinoAtivo.days as Treino["days"],
          },
        },
      };
    }

    const { data: avaliacaoRow } = await doUsuario
      .from("body_assessments")
      .select("id, status, extracted_data")
      .eq("id", assessmentId)
      .maybeSingle();
    if (!avaliacaoRow) return falha(404, "Avaliação não encontrada.");
    if (avaliacaoRow.status !== "reviewed") {
      return falha(409, "Revise os dados da avaliação antes de gerar o plano.");
    }
    const avaliacao = avaliacaoSchema.safeParse(avaliacaoRow.extracted_data);
    if (!avaliacao.success) {
      return falha(422, "A avaliação precisa ter o peso preenchido.");
    }

    if (!("generationId" in pedido)) {
      const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [doDia, doTipo] = await Promise.all([
        admin
          .from("plan_generations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .neq("status", "error")
          .gte("created_at", ontem),
        admin
          .from("plan_generations")
          .select("id", { count: "exact", head: true })
          .eq("assessment_id", assessmentId)
          .eq("kind", tipo)
          .eq("status", "done"),
      ]);
      if ((doDia.count ?? 0) >= LIMITE_DIARIO) {
        return falha(429, "Limite de pedidos do dia atingido. Tente amanhã.");
      }
      if (tipo === "initial" && (doTipo.count ?? 0) >= LIMITE_DE_PLANOS_POR_AVALIACAO) {
        return falha(429, "Essa avaliação já gerou o máximo de planos. Peça uma mudança no plano atual ou envie uma nova avaliação.");
      }
      if (tipo === "revision" && (doTipo.count ?? 0) >= LIMITE_DE_MUDANCAS_POR_AVALIACAO) {
        return falha(429, "Limite de mudanças deste plano atingido. Envie uma nova avaliação para gerar outro.");
      }

      const { data: criado, error } = await admin
        .from("plan_generations")
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          kind: tipo,
          feedback,
          profile: perfil,
        })
        .select("id")
        .single();
      if (error || !criado) return falha(500, error?.message ?? "Falha ao registrar o pedido.");
      generationId = criado.id;
    }

    try {
      const plano = await gerarPlano(
        provedoresGemini(chave, Deno.env.get("GEMINI_MODELS")),
        avaliacao.data,
        perfil,
        { revisao },
      );

      const { data: ids, error } = await admin.rpc("complete_plan_generation", {
        p_generation_id: generationId,
        p_model: plano.modelo,
        p_nutrition: plano.nutrition,
        p_workout: plano.workout,
        p_sources: plano.sources,
      });
      if (error) throw new Error(error.message);

      // O que o pedido de mudança ensinou fica no perfil pros próximos planos.
      const { exerciciosIndisponiveis, alimentosQueNaoGosta } = plano.preferencias;
      if (exerciciosIndisponiveis.length > 0 || alimentosQueNaoGosta.length > 0) {
        const { error: erroDoPerfil } = await admin
          .from("user_profiles")
          .update({
            unavailable_exercises: [...perfil.exerciciosIndisponiveis, ...exerciciosIndisponiveis],
            disliked_foods: juntarAlimentos(perfil.alimentosQueNaoGosta, alimentosQueNaoGosta),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (erroDoPerfil) console.error("generate-plan perfil", generationId, erroDoPerfil.message);
      }

      return Response.json({
        status: "done",
        generationId,
        ...ids,
        model: plano.modelo,
        nutrition: plano.nutrition,
        workout: plano.workout,
        sources: plano.sources,
        adjustments: plano.ajustes,
        learnedPreferences: plano.preferencias,
      });
    } catch (erro) {
      if (erro instanceof ErroDeCota) {
        await admin
          .from("plan_generations")
          .update({ status: "queued", error_message: erro.message })
          .eq("id", generationId);
        return Response.json({ status: "queued", generationId }, { status: 202 });
      }

      const mensagem = erro instanceof Error ? erro.message : "Falha ao gerar o plano.";
      console.error("generate-plan", generationId, mensagem);
      await admin
        .from("plan_generations")
        .update({ status: "error", error_message: mensagem, finished_at: new Date().toISOString() })
        .eq("id", generationId);
      return falha(502, "Não foi possível gerar o plano agora. Tente de novo em instantes.");
    }
  }),
};
