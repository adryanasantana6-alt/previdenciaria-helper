export const FASES = [
  { value: "atendimento_documentos", label: "Atendimento & Documentos", curto: "Atendimento" },
  { value: "requerimento_inss", label: "Requerimento INSS", curto: "Requerimento" },
  { value: "exigencia", label: "Exigência Aberta (30d)", curto: "Exigência" },
  { value: "aguardando_decisao", label: "Aguardando Decisão", curto: "Decisão" },
  { value: "recurso_crps", label: "Recurso CRPS", curto: "CRPS" },
  { value: "judicial", label: "Ação Judicial (JEF/Vara)", curto: "Judicial" },
  { value: "concedido", label: "Concedido / Implantação", curto: "Concedido" },
  { value: "encerrado", label: "Encerrado", curto: "Encerrado" },
] as const;

export type FaseValue = (typeof FASES)[number]["value"];

export const MATERIAS = [
  "Aposentadorias",
  "Benefícios por incapacidade",
  "BPC/LOAS",
  "Salário-maternidade",
  "Auxílio-acidente",
  "Pensão por morte",
  "Outros",
] as const;

export const SITUACOES = [
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "atrasado", label: "Atrasado" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const TIPOS_PRAZO = [
  { value: "exigencia_inss", label: "Exigência INSS (30 dias)", dias: 30 },
  { value: "recurso_crps", label: "Recurso CRPS (30 dias)", dias: 30 },
  { value: "contrarrazoes_crps", label: "Contrarrazões CRPS (30 dias)", dias: 30 },
  { value: "intimacao_judicial", label: "Intimação judicial", dias: 15 },
  { value: "pericia", label: "Perícia médica / social", dias: 0 },
  { value: "outro", label: "Outro prazo", dias: 15 },
] as const;

export function faseLabel(v: string) {
  return FASES.find((f) => f.value === v)?.label ?? v;
}

export function prazoTipoLabel(v: string | null | undefined) {
  if (!v) return "—";
  return TIPOS_PRAZO.find((t) => t.value === v)?.label ?? v;
}

export function situacaoLabel(v: string) {
  return SITUACOES.find((s) => s.value === v)?.label ?? v;
}

export function brl(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function dataBR(v: string | null | undefined) {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return d ? `${d}/${m}/${y}` : v;
}

/** Dias restantes até a data (negativo = vencido). */
export function diasRestantes(data: string | null | undefined): number | null {
  if (!data) return null;
  const hoje = new Date();
  const alvo = new Date(`${data}T12:00:00`);
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12);
  return Math.round((alvo.getTime() - base.getTime()) / 86400000);
}

export function prazoStatus(dias: number | null) {
  if (dias === null) return { label: "—", tone: "muted" as const };
  if (dias < 0) return { label: `Vencido há ${Math.abs(dias)}d`, tone: "danger" as const };
  if (dias === 0) return { label: "Vence hoje", tone: "danger" as const };
  if (dias <= 7) return { label: `Faltam ${dias}d`, tone: "warn" as const };
  return { label: `Faltam ${dias}d`, tone: "ok" as const };
}

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}
