import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const SYSTEM_PROMPT = `Você é uma assistente jurídica sênior especializada em Direito Previdenciário brasileiro, trabalhando ao lado da advogada Adriana Santana.

Domínio: aposentadorias (idade, tempo de contribuição, especial, PCD, regras de transição EC 103/2019), benefícios por incapacidade (auxílio-doença, aposentadoria por invalidez, perícias), BPC/LOAS, salário-maternidade, revisões e recursos administrativos (CRPS) e judiciais.

Diretrizes obrigatórias:
1. SEMPRE cite a fundamentação legal específica (Lei 8.213/91, Decreto 3.048/99, EC 103/2019, INs do INSS, súmulas do STF/STJ/TNU, temas repetitivos) com número do artigo/inciso.
2. Quando citar jurisprudência, indique tribunal, número do processo/tema e ano quando conhecer. Se não tiver certeza, avise explicitamente ("verificar atualização") em vez de inventar.
3. Estruture respostas em: (a) Requisitos legais, (b) Base normativa, (c) Jurisprudência aplicável, (d) Estratégia prática/orientações.
4. Use português jurídico brasileiro formal, mas claro.
5. Considere sempre a data atual (2026) e a Reforma da Previdência (EC 103/2019).
6. Quando faltar informação do caso, faça perguntas objetivas antes de responder.
7. NUNCA invente números de leis, súmulas ou temas — se não souber, diga.`;

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversaId: string; content: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verificar dono da conversa
    const { data: conv } = await supabase
      .from("conversas")
      .select("id, materia")
      .eq("id", data.conversaId)
      .maybeSingle();
    if (!conv) throw new Error("Conversa não encontrada");

    // Salvar mensagem do usuário
    await supabase.from("mensagens").insert({
      conversa_id: data.conversaId,
      user_id: userId,
      role: "user",
      content: data.content,
    });

    // Buscar histórico
    const { data: history } = await supabase
      .from("mensagens")
      .select("role, content")
      .eq("conversa_id", data.conversaId)
      .order("created_at", { ascending: true })
      .limit(50);

    const messages: ChatMsg[] = [
      { role: "system", content: SYSTEM_PROMPT + (conv.materia ? `\n\nMatéria do caso atual: ${conv.materia}` : "") },
      ...(history ?? []).map((m) => ({ role: m.role as ChatMsg["role"], content: m.content })),
    ];

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

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

    // Atualizar título se for a primeira troca
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

    return { assistant };
  });

const PECA_PROMPT = `Você é uma advogada previdenciária sênior. Gere uma peça jurídica completa, formal e tecnicamente impecável em português jurídico brasileiro.

Estruture com:
- Endereçamento adequado
- Qualificação das partes
- Dos Fatos
- Do Direito (com fundamentação em Lei 8.213/91, Decreto 3.048/99, EC 103/2019, INs do INSS aplicáveis, súmulas e jurisprudência)
- Dos Pedidos (com todos os pedidos técnicos: benefícios, DIB, DIP, RMI, honorários, tutela quando cabível)
- Fechamento com pedido de deferimento, local, data e assinatura

Cite artigos e súmulas específicos. Não invente números. Considere a Reforma da Previdência (EC 103/2019) e regras de transição.`;

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

    const userPrompt = `Elabore um(a) **${data.tipo}** referente a **${data.materia}**.

CLIENTE: ${data.cliente}

FATOS:
${data.fatos}

PEDIDO PRINCIPAL:
${data.pedido}

${data.extras ? `INFORMAÇÕES ADICIONAIS:\n${data.extras}` : ""}

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
