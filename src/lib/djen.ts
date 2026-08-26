// Integração com a API pública Comunica PJe (DJEN — Diário de Justiça Eletrônico Nacional)
// Documentação: https://comunicaapi.pje.jus.br/swagger/index.html

export const DJEN_BASE = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";

export type DjenFiltro = {
  numeroOab?: string;
  ufOab?: string;
  nomeAdvogado?: string;
  nomeParte?: string;
  numeroProcesso?: string;
  siglaTribunal?: string;
  dataInicio?: string; // yyyy-mm-dd
  dataFim?: string; // yyyy-mm-dd
  pagina?: number;
  itensPorPagina?: number;
};

export type DjenItem = {
  id?: number | string;
  numero_processo?: string;
  numeroprocessocommascara?: string;
  siglaTribunal?: string;
  nomeOrgao?: string;
  tipoComunicacao?: string;
  tipoDocumento?: string;
  texto?: string;
  data_disponibilizacao?: string;
  datadisponibilizacao?: string;
  link?: string;
  meio?: string;
  destinatarios?: { nome?: string; polo?: string }[];
  destinatarioadvogados?: { advogado?: { nome?: string; numero_oab?: string; uf_oab?: string } }[];
};

export type DjenResposta = {
  status?: string;
  message?: string;
  count?: number;
  items?: DjenItem[];
};

export function buildDjenUrl(f: DjenFiltro): string {
  const p = new URLSearchParams();
  if (f.numeroOab) p.set("numeroOab", f.numeroOab.replace(/\D/g, ""));
  if (f.ufOab) p.set("ufOab", f.ufOab.toUpperCase());
  if (f.nomeAdvogado) p.set("nomeAdvogado", f.nomeAdvogado);
  if (f.nomeParte) p.set("nomeParte", f.nomeParte);
  if (f.numeroProcesso) p.set("numeroProcesso", f.numeroProcesso.replace(/\D/g, ""));
  if (f.siglaTribunal) p.set("siglaTribunal", f.siglaTribunal.toUpperCase());
  if (f.dataInicio) p.set("dataDisponibilizacaoInicio", f.dataInicio);
  if (f.dataFim) p.set("dataDisponibilizacaoFim", f.dataFim);
  p.set("pagina", String(f.pagina ?? 1));
  p.set("itensPorPagina", String(f.itensPorPagina ?? 20));
  return `${DJEN_BASE}?${p.toString()}`;
}

export function dataItem(i: DjenItem) {
  return i.data_disponibilizacao ?? i.datadisponibilizacao ?? "";
}

export function processoItem(i: DjenItem) {
  return i.numeroprocessocommascara ?? i.numero_processo ?? "—";
}

export function advogadosItem(i: DjenItem) {
  return (i.destinatarioadvogados ?? [])
    .map((d) => d.advogado?.nome)
    .filter(Boolean)
    .join(", ");
}

export function limparHtml(texto = "") {
  return texto
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Fallback executado no navegador (a API é restrita a acessos do Brasil).
export async function buscarPublicacoesNoNavegador(f: DjenFiltro): Promise<DjenResposta> {
  const resp = await fetch(buildDjenUrl(f), { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`DJEN respondeu ${resp.status}`);
  return (await resp.json()) as DjenResposta;
}
