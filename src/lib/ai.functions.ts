import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const EMBED_GATEWAY = "https://ai.gateway.lovable.dev/v1/embeddings";
const MODEL = "google/gemini-3.6-flash";
const EMBED_MODEL = "google/gemini-embedding-001";

const SYSTEM_PROMPT = `Você é uma assistente jurídica sênior especializada em Direito Previdenciário brasileiro, trabalhando ao lado da advogada Adriana Santana.

Domínio: aposentadorias (idade, tempo de contribuição, especial, PCD, regras de transição EC 103/2019), benefícios por incapacidade (auxílio-doença, aposentadoria por invalidez, perícias), BPC/LOAS, salário-maternidade, revisões e recursos administrativos (CRPS) e judiciais.

Diretrizes obrigatórias:
1. SEMPRE cite a fundamentação legal específica (Lei 8.213/91, Decreto 3.048/99, EC 103/2019, INs do INSS, súmulas do STF/STJ/TNU, temas repetitivos) com número do artigo/inciso.
2. Quando citar jurisprudência, indique tribunal, número do processo/tema e ano quando conhecer. Se não tiver certeza, avise explicitamente ("verificar atualização") em vez de inventar.
3. Estruture respostas em: (a) Requisitos legais, (b) Base normativa, (c) Jurisprudência aplicável, (d) Estratégia prática/orientações.
4. Use português jurídico brasileiro formal, mas claro.
5. Considere sempre a data atual (2026) e a Reforma da Previdência (EC 103/2019).
6. Quando faltar informação do caso, faça perguntas objetivas antes de responder.
7. NUNCA invente números de leis, súmulas ou temas — se não souber, diga.
8. Quando for fornecido um bloco "CONTEXTO DA BIBLIOTECA", PRIORIZE essas fontes: cite-as textualmente entre aspas quando pertinente e mencione o título da fonte. Se o contexto não bastar, complete com seu conhecimento avisando "não consta na biblioteca".`;

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

function chunkText(text: string, maxLen = 1200, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length <= maxLen) return [clean];
  const paragraphs = clean.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxLen) {
      if (current) chunks.push(current);
      if (p.length > maxLen) {
        for (let i = 0; i < p.length; i += maxLen - overlap) {
          chunks.push(p.slice(i, i + maxLen));
        }
        current = "";
      } else {
        current = p;
      }
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((c) => c.trim().length > 30);
}

async function embed(inputs: string[], key: string): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += 90) {
    const batch = inputs.slice(i, i + 90);
    const resp = await fetch(EMBED_GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: batch }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 429) throw new Error("Muitas requisições de embedding. Tente novamente em instantes.");
      if (resp.status === 402) throw new Error("Créditos de IA esgotados.");
      throw new Error(`Erro embeddings (${resp.status}): ${body.slice(0, 200)}`);
    }
    const json = (await resp.json()) as { data: { embedding: number[]; index: number }[] };
    const ordered = [...json.data].sort((a, b) => a.index - b.index);
    for (const d of ordered) out.push(d.embedding);
  }
  return out;
}

const vecLiteral = (v: number[]) => `[${v.join(",")}]`;

export const indexarDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { documentoId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const { data: doc, error: docErr } = await supabase
      .from("documentos")
      .select("id, titulo, conteudo")
      .eq("id", data.documentoId)
      .maybeSingle();
    if (docErr) throw new Error(docErr.message);
    if (!doc) throw new Error("Documento não encontrado");

    await supabase.from("documento_chunks").delete().eq("documento_id", doc.id);

    const chunks = chunkText(doc.conteudo);
    if (!chunks.length) return { chunks: 0 };

    const enriched = chunks.map((c) => `${doc.titulo}\n\n${c}`);
    const vectors = await embed(enriched, key);

    const rows = chunks.map((conteudo, i) => ({
      documento_id: doc.id,
      user_id: userId,
      ordem: i,
      conteudo,
      embedding: vecLiteral(vectors[i]),
    }));

    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase.from("documento_chunks").insert(rows.slice(i, i + 50));
      if (error) throw new Error(error.message);
    }
    return { chunks: rows.length };
  });

export const indexarPendentes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const { data: docs, error } = await supabase
      .from("documentos")
      .select("id, titulo, conteudo")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!docs?.length) return { processados: 0, chunks: 0 };

    const { data: existing } = await supabase
      .from("documento_chunks")
      .select("documento_id")
      .eq("user_id", userId);
    const indexed = new Set((existing ?? []).map((r) => r.documento_id));
    const pendentes = docs.filter((d) => !indexed.has(d.id));

    let totalChunks = 0;
    for (const doc of pendentes) {
      const chunks = chunkText(doc.conteudo);
      if (!chunks.length) continue;
      const enriched = chunks.map((c) => `${doc.titulo}\n\n${c}`);
      const vectors = await embed(enriched, key);
      const rows = chunks.map((conteudo, i) => ({
        documento_id: doc.id,
        user_id: userId,
        ordem: i,
        conteudo,
        embedding: vecLiteral(vectors[i]),
      }));
      for (let i = 0; i < rows.length; i += 50) {
        const { error: insErr } = await supabase.from("documento_chunks").insert(rows.slice(i, i + 50));
        if (insErr) throw new Error(insErr.message);
      }
      totalChunks += rows.length;
    }
    return { processados: pendentes.length, chunks: totalChunks };
  });

async function buscarContexto(supabase: any, query: string, key: string): Promise<string> {
  try {
    const [qvec] = await embed([query], key);
    const { data, error } = await supabase.rpc("match_chunks", {
      query_embedding: vecLiteral(qvec),
      match_count: 6,
    });
    if (error || !data?.length) return "";
    const relevant = (data as any[]).filter((r) => r.similarity > 0.35);
    if (!relevant.length) return "";
    return relevant
      .map(
        (r, i) =>
          `[Fonte ${i + 1} — ${r.titulo}${r.fonte ? ` (${r.fonte})` : ""}]\n${r.conteudo}`,
      )
      .join("\n\n---\n\n");
  } catch (e) {
    console.error("RAG fail", e);
    return "";
  }
}

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversaId: string; content: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: conv } = await supabase
      .from("conversas")
      .select("id, materia")
      .eq("id", data.conversaId)
      .maybeSingle();
    if (!conv) throw new Error("Conversa não encontrada");

    await supabase.from("mensagens").insert({
      conversa_id: data.conversaId,
      user_id: userId,
      role: "user",
      content: data.content,
    });

    const { data: history } = await supabase
      .from("mensagens")
      .select("role, content")
      .eq("conversa_id", data.conversaId)
      .order("created_at", { ascending: true })
      .limit(50);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const contexto = await buscarContexto(supabase, data.content, key);

    const systemContent =
      SYSTEM_PROMPT +
      (conv.materia ? `\n\nMatéria do caso atual: ${conv.materia}` : "") +
      (contexto
        ? `\n\n===== CONTEXTO DA BIBLIOTECA =====\n${contexto}\n===== FIM DO CONTEXTO =====`
        : "");

    const messages: ChatMsg[] = [
      { role: "system", content: systemContent },
      ...(history ?? []).map((m) => ({ role: m.role as ChatMsg["role"], content: m.content })),
    ];

    const resp = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 429) throw new Error("Muitas requisições. Tente novamente em instantes.");
      if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos em Configurações.");
      throw new Error(`Erro IA (${resp.status}): ${body.slice(0, 200)}`);
    }

    const json = (await resp.json()) as { choices: { message: { content: string } }[] };
    const assistant = json.choices[0]?.message.content ?? "";

    await supabase.from("mensagens").insert({
      conversa_id: data.conversaId,
      user_id: userId,
      role: "assistant",
      content: assistant,
    });

    const { count } = await supabase
      .from("mensagens")
      .select("*", { count: "exact", head: true })
      .eq("conversa_id", data.conversaId);
    if ((count ?? 0) <= 2) {
      const titulo = data.content.slice(0, 60);
      await supabase.from("conversas").update({ titulo }).eq("id", data.conversaId);
    } else {
      await supabase.from("conversas").update({ updated_at: new Date().toISOString() }).eq("id", data.conversaId);
    }

    return { assistant, fontes: contexto ? true : false };
  });

const PECA_PROMPT = `Você é uma advogada previdenciária sênior. Gere uma peça jurídica completa, formal e tecnicamente impecável em português jurídico brasileiro.

Estruture com:
- Endereçamento adequado
- Qualificação das partes
- Dos Fatos
- Do Direito (com fundamentação em Lei 8.213/91, Decreto 3.048/99, EC 103/2019, INs do INSS aplicáveis, súmulas e jurisprudência)
- Dos Pedidos (com todos os pedidos técnicos: benefícios, DIB, DIP, RMI, honorários, tutela quando cabível)
- Fechamento com pedido de deferimento, local, data e assinatura

Cite artigos e súmulas específicos. Não invente números. Considere a Reforma da Previdência (EC 103/2019) e regras de transição.
Se for fornecido um bloco "CONTEXTO DA BIBLIOTECA", cite textualmente essas fontes quando pertinente.`;

export const gerarPeca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    tipo: string;
    materia: string;
    cliente: string;
    fatos: string;
    pedido: string;
    extras?: string;
  }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const queryRag = `${data.tipo} ${data.materia}\n${data.pedido}\n${data.fatos.slice(0, 500)}`;
    const contexto = await buscarContexto(supabase, queryRag, key);

    const userPrompt = `Elabore um(a) **${data.tipo}** referente a **${data.materia}**.

CLIENTE: ${data.cliente}

FATOS:
${data.fatos}

PEDIDO PRINCIPAL:
${data.pedido}

${data.extras ? `INFORMAÇÕES ADICIONAIS:\n${data.extras}` : ""}

${contexto ? `===== CONTEXTO DA BIBLIOTECA =====\n${contexto}\n===== FIM DO CONTEXTO =====\n` : ""}
Gere a peça completa em Markdown, pronta para revisão.`;

    const resp = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: PECA_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 429) throw new Error("Muitas requisições. Tente novamente.");
      if (resp.status === 402) throw new Error("Créditos de IA esgotados.");
      throw new Error(`Erro IA (${resp.status}): ${body.slice(0, 200)}`);
    }

    const json = (await resp.json()) as { choices: { message: { content: string } }[] };
    const conteudo = json.choices[0]?.message.content ?? "";

    const titulo = `${data.tipo} — ${data.cliente}`;
    const { data: peca, error } = await supabase
      .from("pecas")
      .insert({
        user_id: userId,
        tipo: data.tipo,
        materia: data.materia,
        cliente: data.cliente,
        titulo,
        conteudo,
        dados_entrada: {
          fatos: data.fatos,
          pedido: data.pedido,
          extras: data.extras ?? "",
        },
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: peca.id, conteudo };
  });
