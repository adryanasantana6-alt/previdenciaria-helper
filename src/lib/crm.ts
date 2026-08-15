export const FASES = [
  { value: "juntando_documentacao", label: "Juntando documentação" },
  { value: "requerimento", label: "Requerimento" },
  { value: "aguardando_decisao", label: "Aguardando decisão" },
  { value: "fase_judicial", label: "Iniciar fase judicial" },
  { value: "acompanhar_processo", label: "Acompanhar processo" },
  { value: "encerrado", label: "Encerrado" },
] as const;

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

export function faseLabel(v: string) {
  return FASES.find((f) => f.value === v)?.label ?? v;
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
