import { supabase } from "@/integrations/supabase/client";
import { buscarPublicacoes } from "@/lib/djen.functions";
import {
  advogadosItem,
  buscarPublicacoesNoNavegador,
  dataItem,
  limparHtml,
  processoItem,
  type DjenFiltro,
  type DjenItem,
  type DjenResposta,
} from "@/lib/djen";

export const FASES = [
  { id: "nova", label: "Novas" },
  { id: "em_analise", label: "Em análise" },
  { id: "prazo_calculado", label: "Prazo calculado" },
  { id: "em_elaboracao", label: "Elaborando peça" },
  { id: "protocolada", label: "Protocolada" },
  { id: "concluida", label: "Concluída" },
] as const;

export type FaseId = (typeof FASES)[number]["id"];

export function labelFase(id: string) {
  return FASES.find((f) => f.id === id)?.label ?? id;
}

export type Intimacao = {
  id: string;
  djen_id: string;
  numero_processo: string | null;
  tribunal: string | null;
  orgao: string | null;
  tipo_comunicacao: string | null;
  texto: string;
  data_disponibilizacao: string | null;
  link: string | null;
  advogados: string | null;
  fase: string;
  prazo_data: string | null;
  responsavel: string | null;
  observacoes: string | null;
};

export type DjenConfig = {
  user_id: string;
  numero_oab: string | null;
  uf_oab: string | null;
  auto_sync: boolean;
  dias_retroativos: number;
  ultima_sincronizacao: string | null;
};

function dataOffset(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function chaveItem(item: DjenItem, idx: number) {
  return String(item.id ?? `${processoItem(item)}|${dataItem(item)}|${idx}`);
}

async function consultar(filtro: DjenFiltro): Promise<DjenResposta> {
  try {
    const resp = await buscarPublicacoes({ data: filtro });
    if (!resp.erro && resp.items) return resp;
  } catch {
    /* tenta pelo navegador */
  }
  return buscarPublicacoesNoNavegador(filtro);
}

export async function carregarConfig(userId: string): Promise<DjenConfig | null> {
  const { data } = await supabase
    .from("djen_config")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as DjenConfig | null) ?? null;
}

/** Busca no DJEN e grava as intimações novas. Retorna quantas foram inseridas. */
export async function sincronizarIntimacoes(
  userId: string,
  opts: { forcar?: boolean } = {},
): Promise<{ novas: number; total: number; motivo?: string }> {
  const cfg = await carregarConfig(userId);
  if (!cfg?.numero_oab || !cfg.uf_oab) return { novas: 0, total: 0, motivo: "sem-oab" };
  if (!opts.forcar && !cfg.auto_sync) return { novas: 0, total: 0, motivo: "desativado" };

  const hoje = new Date().toISOString().slice(0, 10);
  if (!opts.forcar && cfg.ultima_sincronizacao?.slice(0, 10) === hoje) {
    return { novas: 0, total: 0, motivo: "ja-sincronizado" };
  }

  const resp = await consultar({
    numeroOab: cfg.numero_oab,
    ufOab: cfg.uf_oab,
    dataInicio: dataOffset(-Math.abs(cfg.dias_retroativos || 15)),
    dataFim: hoje,
    pagina: 1,
    itensPorPagina: 100,
  });

  const items = resp.items ?? [];
  let novas = 0;

  if (items.length) {
    const linhas = items.map((item, idx) => ({
      user_id: userId,
      djen_id: chaveItem(item, idx),
      numero_processo: processoItem(item),
      tribunal: item.siglaTribunal ?? null,
      orgao: item.nomeOrgao ?? null,
      tipo_comunicacao: item.tipoComunicacao ?? null,
      texto: limparHtml(item.texto),
      data_disponibilizacao: dataItem(item) ? dataItem(item).slice(0, 10) : null,
      link: item.link ?? null,
      advogados: advogadosItem(item) || null,
    }));

    const { data, error } = await supabase
      .from("intimacoes")
      .upsert(linhas, { onConflict: "user_id,djen_id", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    novas = data?.length ?? 0;
  }

  await supabase
    .from("djen_config")
    .update({ ultima_sincronizacao: new Date().toISOString() })
    .eq("user_id", userId);

  return { novas, total: items.length };
}
