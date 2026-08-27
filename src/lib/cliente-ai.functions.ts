import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

const BASE = `Você é assistente jurídica sênior em Direito Previdenciário brasileiro, atuando com a advogada Adriana Santana.
Escreva sempre em português jurídico brasileiro, claro e objetivo.
Regras: cite a fundamentação legal específica (Lei 8.213/91, Lei 8.212/91, Decreto 3.048/99, EC 103/2019, INs do INSS, súmulas e temas do STF/STJ/TNU) com artigo/inciso; NUNCA invente números de lei, súmula, tema, data ou valor; quando um dado não constar dos documentos, escreva "não consta nos documentos anexados".
Explicite SEMPRE os prazos aplicáveis (ex.: 30 dias para exigência do INSS e recurso ao CRPS, art. 305 e ss. do RPS; prazos processuais) com a data-limite quando houver data de referência nos autos.`;

const PROMPTS: Record<string, string> = {
  relatorio: `${BASE}
Tarefa: elaborar RELATÓRIO PROCESSUAL OBJETIVO do cliente, em Markdown, com as seções:
1. Identificação do segurado (dados cadastrais disponíveis)
2. Demandas e fase atual
3. Documentos disponíveis na pasta (lista objetiva do que existe e para que serve)
4. Documentos faltantes / providências necessárias
5. Cronologia dos fatos e do procedimento (datas: DER, DIB, indeferimento, perícia, exigências)
6. Análise jurídica sumária (requisitos legais x provas existentes)
7. Prazos em curso, com data-limite e base normativa
8. Recomendação de próximo passo
Seja conciso e factual — nada de retórica.`,
  esboco: `${BASE}
Tarefa: entregar um ESBOÇO (roteiro estruturado) da peça solicitada, em Markdown: tópicos, teses a sustentar, fundamentos legais e jurisprudenciais que serão invocados, provas de cada alegação, pedidos previstos e prazos. Não redija a peça por extenso — apenas o esqueleto comentado, para aprovação da advogada.`,
  peca: `${BASE}
Tarefa: redigir a PEÇA COMPLETA solicitada, em Markdown, pronta para revisão: endereçamento, qualificação das partes conforme os dados do cliente, Dos Fatos (com datas dos documentos), Do Direito (fundamentação legal e jurisprudencial), Dos Pedidos (benefício, DIB, DIP, RMI, honorários, tutela quando cabível, gratuidade se aplicável), prazos explicitados, fechamento com pedido de deferimento, local, data e assinatura.`,
  refino: `${BASE}
Tarefa: REFINAR o texto fornecido conforme as instruções da advogada, mantendo a estrutura aprovada e aprofundando a fundamentação. Devolva o texto final completo em Markdown.`,
};

export type ModoAssistente = "relatorio" | "esboco" | "peca" | "refino";

async function chamarIA(system: string, user: string, key: string) {
  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    if (resp.status === 429) throw new Error("Muitas requisições. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`Erro IA (${resp.status}): ${body.slice(0, 200)}`);
  }
  const json = (await resp.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message.content ?? "";
}

export const assistenteCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      clienteId: string;
      modo: ModoAssistente;
      tipoPeca?: string;
      instrucoes?: string;
      textoBase?: string;
      salvar?: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const [{ data: cliente }, { data: casos }, { data: docs }] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", data.clienteId).maybeSingle(),
      supabase
        .from("casos")
        .select("titulo, materia, fase, descricao, numero_processo, protocolo, der, dib, created_at")
        .eq("cliente_id", data.clienteId),
      supabase
        .from("cliente_documentos")
        .select("nome, categoria, pasta, conteudo, created_at")
        .eq("cliente_id", data.clienteId)
        .order("created_at", { ascending: true }),
    ]);

    if (!cliente) throw new Error("Cliente não encontrado.");

    const dadosCliente = Object.entries(cliente)
      .filter(([k, v]) => v && !["id", "user_id", "govbr_senha", "created_at", "updated_at"].includes(k))
      .map(([k, v]) => `- ${k}: ${String(v)}`)
      .join("\n");

    const demandas = (casos ?? []).length
      ? (casos ?? [])
          .map(
            (k: any) =>
              `- ${k.titulo ?? "Demanda"} | matéria: ${k.materia ?? "—"} | fase: ${k.fase ?? "—"} | processo: ${k.numero_processo ?? "—"} | protocolo: ${k.protocolo ?? "—"} | DER: ${k.der ?? "—"} | DIB: ${k.dib ?? "—"}\n  ${k.descricao ?? ""}`,
          )
          .join("\n")
      : "Nenhuma demanda cadastrada.";

    let orcamento = 90000;
    const documentos = (docs ?? [])
      .map((d: any) => {
        const corpo = (d.conteudo ?? "").trim();
        const fatia = corpo.slice(0, Math.max(0, Math.min(12000, orcamento)));
        orcamento -= fatia.length;
        return `===== DOCUMENTO: ${d.nome} (${d.pasta ?? d.categoria ?? "sem pasta"}) =====\n${fatia || "[sem texto extraído — provavelmente imagem/escaneado]"}`;
      })
      .join("\n\n");

    const hoje = new Date().toISOString().slice(0, 10);

    const pedido =
      data.modo === "relatorio"
        ? "Gere o relatório processual objetivo."
        : data.modo === "refino"
          ? `Refine a peça abaixo conforme as instruções.\n\nINSTRUÇÕES DA ADVOGADA:\n${data.instrucoes ?? "Aprofundar fundamentação e finalizar."}\n\n===== TEXTO BASE =====\n${(data.textoBase ?? "").slice(0, 60000)}\n===== FIM =====`
          : `Tipo de peça solicitada: ${data.tipoPeca ?? "Petição inicial"}.${data.instrucoes ? `\nOrientações da advogada: ${data.instrucoes}` : ""}`;

    const userPrompt = `DATA DE HOJE: ${hoje}

===== DADOS DO CLIENTE =====
${dadosCliente || "sem dados cadastrais"}

===== DEMANDAS =====
${demandas}

===== DOCUMENTOS DA PASTA DO CLIENTE =====
${documentos || "Nenhum documento anexado."}

===== SOLICITAÇÃO =====
${pedido}`;

    const conteudo = await chamarIA(PROMPTS[data.modo] ?? PROMPTS.relatorio, userPrompt, key);

    let pecaId: string | null = null;
    if (data.salvar) {
      const tipo =
        data.modo === "relatorio" ? "Relatório processual" : (data.tipoPeca ?? "Peça");
      const { data: peca } = await supabase
        .from("pecas")
        .insert({
          user_id: userId,
          tipo,
          materia: (casos ?? [])[0]?.materia ?? "Outros",
          cliente: (cliente as any).nome,
          titulo: `${tipo} — ${(cliente as any).nome}`,
          conteudo,
          dados_entrada: { origem: "ficha_cliente", clienteId: data.clienteId, modo: data.modo },
        })
        .select("id")
        .maybeSingle();
      pecaId = peca?.id ?? null;
    }

    return { conteudo, pecaId };
  });
