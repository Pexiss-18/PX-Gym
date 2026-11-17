import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { encodeBase64 } from "@std/encoding/base64";
import { z } from "zod";
import { extrairAvaliacao, PdfSemAvaliacao } from "../_shared/avaliacao/extrair.ts";
import { provedoresGemini } from "../_shared/ia/gemini.ts";
import { ErroDeCota } from "../_shared/ia/provedor.ts";

/** Mesmo teto do envio pelo web. */
const TAMANHO_MAXIMO = 15 * 1024 * 1024;
/** PDFs lidos por pessoa em 24h: cada leitura gasta a cota gratuita do Gemini. */
const LIMITE_DIARIO = 6;
const BUCKET = "assessments";

const corpoSchema = z.object({ pdfPath: z.string().min(1).max(200) });

function falha(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** Hoje no fuso do Brasil, AAAA-MM-DD (data no futuro é descartada). */
function hojeNoBrasil(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/**
 * POST /extract-assessment { pdfPath }
 *   → 200 { assessment: { weightKg, bodyFatPct, muscleMassKg, measurements,
 *                         assessmentDate, notes }, model }
 *
 * O app sobe o PDF no bucket "assessments" (pasta do próprio usuário, RLS) e
 * chama esta função, que lê o arquivo com o Gemini e devolve os números pro
 * app preencher o formulário. Nada é gravado em body_assessments aqui: a
 * pessoa confere e salva. Se a leitura falhar, o PDF é apagado.
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return falha(405, "Use POST.");

    const chave = Deno.env.get("GEMINI_API_KEY");
    if (!chave) return falha(500, "GEMINI_API_KEY não configurada no servidor.");

    const corpo = corpoSchema.safeParse(await req.json().catch(() => null));
    if (!corpo.success) return falha(400, "Dados do pedido inválidos.");

    const userId = ctx.userClaims!.id;
    const { pdfPath } = corpo.data;
    // Só a pasta do próprio usuário; o RLS do storage também garante.
    if (!pdfPath.startsWith(`${userId}/`) || !pdfPath.endsWith(".pdf") || pdfPath.includes("..")) {
      return falha(403, "Esse arquivo não é seu.");
    }

    const storage = ctx.supabase.storage.from(BUCKET);
    const apagar = () => storage.remove([pdfPath]).catch(() => undefined);

    // Limite diário contado pelos PDFs que a pessoa subiu nas últimas 24h.
    const { data: recentes } = await storage.list(userId, {
      limit: 50,
      sortBy: { column: "created_at", order: "desc" },
    });
    const ontem = Date.now() - 24 * 60 * 60 * 1000;
    const doDia = (recentes ?? []).filter((f) => f.created_at && Date.parse(f.created_at) > ontem);
    if (doDia.length > LIMITE_DIARIO) {
      await apagar();
      return falha(429, "Você já enviou muitos PDFs hoje. Tente amanhã ou digite os números.");
    }

    const { data: arquivo, error: erroDeLeitura } = await storage.download(pdfPath);
    if (erroDeLeitura || !arquivo) return falha(404, "Não achei o PDF enviado. Tente de novo.");
    if (arquivo.size > TAMANHO_MAXIMO) {
      await apagar();
      return falha(413, "O PDF passa de 15 MB.");
    }
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    // %PDF no começo: não manda pra IA o que não é PDF.
    if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
      await apagar();
      return falha(415, "Esse arquivo não é um PDF.");
    }

    try {
      const provedores = provedoresGemini(chave, Deno.env.get("GEMINI_MODELS"));
      const { avaliacao, modelo } = await extrairAvaliacao(provedores, encodeBase64(bytes), hojeNoBrasil());
      return Response.json({ assessment: avaliacao, model: modelo });
    } catch (erro) {
      await apagar();
      if (erro instanceof PdfSemAvaliacao) return falha(422, erro.message);
      if (erro instanceof ErroDeCota) {
        return falha(503, "A leitura de PDFs está ocupada agora. Tente daqui a pouco ou digite os números.");
      }
      console.error("extract-assessment", erro instanceof Error ? erro.message : erro);
      return falha(502, "Não consegui ler esse PDF. Tente de novo ou digite os números.");
    }
  }),
};
