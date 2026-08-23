import { dataBR } from "@/lib/crm";

export type ClienteDoc = {
  nome: string;
  cpf?: string | null;
  rg?: string | null;
  nit?: string | null;
  data_nascimento?: string | null;
  estado_civil?: string | null;
  profissao?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
};

export type Advogado = {
  nome: string;
  oab: string;
  endereco?: string | null;
};

const V = (x?: string | null, fallback = "____________________") =>
  x && String(x).trim() ? String(x).trim() : fallback;

export function qualificacao(c: ClienteDoc) {
  return [
    `${V(c.nome)}`,
    c.data_nascimento ? `nascido(a) em ${dataBR(c.data_nascimento)}` : null,
    `${V(c.estado_civil, "estado civil não informado")}`,
    `${V(c.profissao, "profissão não informada")}`,
    `portador(a) do RG nº ${V(c.rg)}`,
    `inscrito(a) no CPF sob o nº ${V(c.cpf)}`,
    c.nit ? `NIT/PIS nº ${c.nit}` : null,
    `residente e domiciliado(a) em ${V(c.endereco)}`,
    c.telefone ? `telefone ${c.telefone}` : null,
    c.email ? `e-mail ${c.email}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function dataExtenso(d = new Date()) {
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

function assinaturas(c: ClienteDoc, a: Advogado, cidade: string) {
  return `${V(cidade, "____________________")}, ${dataExtenso()}.


_______________________________________
${V(c.nome)}
CPF nº ${V(c.cpf)}


_______________________________________
${V(a.nome)}
OAB nº ${V(a.oab)}`;
}

export type DocAtendimento = { key: string; titulo: string; descricao: string; texto: string };

export function gerarDocumentosAtendimento(
  c: ClienteDoc,
  a: Advogado,
  cidade = "",
): DocAtendimento[] {
  const q = qualificacao(c);
  const fim = assinaturas(c, a, cidade);

  const procuracao = `PROCURAÇÃO AD JUDICIA ET EXTRA

OUTORGANTE: ${q}.

OUTORGADO(A): ${V(a.nome)}, advogado(a) inscrito(a) na OAB sob o nº ${V(a.oab)}, com escritório profissional em ${V(a.endereco)}, onde recebe intimações e notificações.

PODERES: Pelo presente instrumento particular de mandato, o(a) outorgante nomeia e constitui seu(sua) bastante procurador(a) o(a) outorgado(a), conferindo-lhe os poderes da cláusula ad judicia et extra, para o foro em geral, em qualquer juízo, instância ou tribunal, podendo propor contra quem de direito as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras até final decisão, usando dos recursos legais e acompanhando-os.

PODERES ESPECÍFICOS (art. 105 do CPC): confere ainda poderes especiais para receber citação, confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber e dar quitação, firmar compromisso, assinar declaração de hipossuficiência econômica, requerer os benefícios da justiça gratuita e substabelecer, com ou sem reserva de poderes.

PODERES PREVIDENCIÁRIOS ESPECIAIS: representar o(a) outorgante perante o INSS — Instituto Nacional do Seguro Social, suas Agências da Previdência Social, Conselho de Recursos da Previdência Social (CRPS), Juntas de Recursos e Câmaras de Julgamento, Ouvidoria, Justiça Federal, Juizados Especiais Federais e Justiça Estadual no exercício de competência delegada, para:
a) requerer, protocolar, aditar, desistir e acompanhar requerimentos administrativos de qualquer benefício ou serviço previdenciário e assistencial;
b) cumprir exigências, juntar documentos, prestar declarações e apresentar defesas;
c) interpor recursos ordinários e especiais ao CRPS, apresentar contrarrazões e sustentação oral;
d) requisitar, consultar e retirar cópia integral do processo administrativo, do CNIS — Cadastro Nacional de Informações Sociais, do extrato de contribuições, da carta de concessão, memória de cálculo e comunicações de decisão;
e) ter vista e obter cópia de laudos e pareceres periciais médicos e sociais, inclusive junto ao sistema SABI / SABI-Net e à Perícia Médica Federal;
f) acessar, movimentar e utilizar, em nome do(a) outorgante, os canais digitais Meu INSS, Central 135, portal Gov.br e demais sistemas eletrônicos da Previdência Social, inclusive mediante uso de senha fornecida pelo(a) outorgante, agendar e reagendar perícias e atendimentos;
g) receber valores em nome do(a) outorgante, dando plena e geral quitação, e efetuar a retenção dos honorários contratados.

O(a) outorgante declara que as informações e documentos fornecidos são verdadeiros e autoriza expressamente o tratamento de seus dados pessoais e sensíveis, inclusive dados de saúde, nos termos da Lei nº 13.709/2018 (LGPD), exclusivamente para o cumprimento do presente mandato.

${fim}`;

  const contrato = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E HONORÁRIOS

CONTRATANTE: ${q}.

CONTRATADO(A): ${V(a.nome)}, advogado(a) inscrito(a) na OAB sob o nº ${V(a.oab)}, com escritório em ${V(a.endereco)}.

CLÁUSULA 1ª — DO OBJETO. O(a) CONTRATADO(A) prestará serviços advocatícios especializados em Direito Previdenciário, compreendendo análise do direito, instrução e protocolo de requerimento administrativo perante o INSS, cumprimento de exigências, interposição de recursos ao CRPS e, se necessário, o ajuizamento e acompanhamento da respectiva ação judicial até a implantação do benefício.

CLÁUSULA 2ª — DOS HONORÁRIOS CONTRATUAIS (QUOTA LITIS). Em razão do êxito, e somente na hipótese de concessão, restabelecimento ou revisão do benefício, o(a) CONTRATANTE pagará ao(à) CONTRATADO(A):
a) 30% (trinta por cento) sobre o valor total dos atrasados apurados desde a DER/DIB até a efetiva implantação do benefício, inclusive sobre eventuais valores pagos em cumprimento de sentença, RPV ou precatório;
b) o equivalente às 2 (duas) primeiras mensalidades do benefício concedido ou restabelecido.
Parágrafo único. Não havendo êxito, nada será devido a título de honorários contratuais, ressalvadas as despesas processuais efetivamente adiantadas.

CLÁUSULA 3ª — DA AUTORIZAÇÃO DE RETENÇÃO NA FONTE. O(a) CONTRATANTE autoriza expressamente o(a) CONTRATADO(A) a receber e a reter, na fonte, o percentual e as parcelas previstos na Cláusula 2ª, mediante destaque de honorários contratuais nos autos (art. 22, §4º, da Lei nº 8.906/94), com expedição de alvará, RPV ou precatório em nome do(a) CONTRATADO(A) quanto à sua parte, dando-se recíproca quitação.

CLÁUSULA 4ª — DOS HONORÁRIOS SUCUMBENCIAIS. Os honorários de sucumbência, fixados judicialmente, pertencem exclusivamente ao(à) CONTRATADO(A), nos termos do art. 23 da Lei nº 8.906/94, não se compensando com os honorários contratuais ora ajustados.

CLÁUSULA 5ª — DAS OBRIGAÇÕES DO(A) CONTRATANTE. Fornecer documentos verdadeiros e completos, comparecer a perícias, audiências e atendimentos designados, manter dados de contato atualizados e comunicar imediatamente qualquer intimação, carta ou depósito recebido.

CLÁUSULA 6ª — DAS DESPESAS. Custas, emolumentos, deslocamentos, cópias e honorários de assistente técnico correm por conta do(a) CONTRATANTE, salvo deferimento da gratuidade da justiça.

CLÁUSULA 7ª — DA RESCISÃO. A revogação do mandato ou a renúncia antes do desfecho não afasta o direito aos honorários proporcionais aos serviços já prestados.

CLÁUSULA 8ª — DO FORO. Fica eleito o foro do domicílio do(a) CONTRATANTE para dirimir eventuais controvérsias.

E, por estarem justos e contratados, firmam o presente em duas vias de igual teor.

${fim}`;

  const hipossuficiencia = `DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA

Eu, ${q}, DECLARO, sob as penas da lei, para os fins do disposto no art. 98 do Código de Processo Civil e na Lei nº 1.060/50, que não possuo condições de arcar com as custas processuais, despesas do processo e honorários advocatícios sem prejuízo do próprio sustento e do de minha família.

Declaro, ainda, estar ciente de que a falsidade desta declaração configura crime previsto no art. 299 do Código Penal, sujeitando-me às sanções cíveis e penais cabíveis, bem como ao pagamento das custas e despesas processuais em décuplo (art. 100, parágrafo único, do CPC).

Por ser expressão da verdade, requeiro a concessão dos benefícios da JUSTIÇA GRATUITA e firmo a presente declaração.

${fim}`;

  const meuInss = `TERMO DE AUTORIZAÇÃO DE ACESSO AO MEU INSS E AOS SISTEMAS DIGITAIS DA PREVIDÊNCIA SOCIAL

AUTORIZANTE: ${q}.

AUTORIZADO(A): ${V(a.nome)}, advogado(a), OAB nº ${V(a.oab)}.

Pelo presente termo, o(a) autorizante AUTORIZA EXPRESSAMENTE o(a) advogado(a) acima qualificado(a) a acessar e movimentar, em seu nome, a plataforma MEU INSS, o portal GOV.BR, a Central de Atendimento 135 e os demais sistemas eletrônicos do Instituto Nacional do Seguro Social, inclusive mediante uso de sua senha pessoal, para os seguintes fins:
a) consultar e emitir extratos do CNIS, simulações, cartas de concessão, comunicados e memórias de cálculo;
b) protocolar, aditar, acompanhar e cumprir exigências de requerimentos administrativos e recursos;
c) agendar, reagendar e confirmar perícias médicas, avaliações sociais e atendimentos presenciais;
d) obter cópia integral de processos administrativos, laudos e pareceres periciais;
e) praticar os demais atos digitais necessários ao regular andamento dos pedidos previdenciários.

O(a) autorizante declara ciência de que a senha é de uso pessoal e intransferível, assumindo a responsabilidade pelo seu compartilhamento voluntário, e AUTORIZA o tratamento de seus dados pessoais e sensíveis, inclusive dados de saúde, nos termos da Lei nº 13.709/2018 (LGPD), exclusivamente para as finalidades acima.

Esta autorização vigora enquanto perdurar o mandato outorgado, podendo ser revogada a qualquer tempo mediante comunicação escrita.

${fim}`;

  return [
    {
      key: "procuracao",
      titulo: "Procuração Previdenciária (Ad Judicia et Extra)",
      descricao: "Poderes gerais e específicos: INSS, CRPS, CNIS, SABI, Meu INSS/Gov.br.",
      texto: procuracao,
    },
    {
      key: "contrato",
      titulo: "Contrato de Honorários Advocatícios",
      descricao: "Quota litis 30% dos atrasados + 2 mensalidades, com retenção na fonte.",
      texto: contrato,
    },
    {
      key: "hipossuficiencia",
      titulo: "Declaração de Hipossuficiência Econômica",
      descricao: "Justiça gratuita — art. 98 do CPC e Lei 1.060/50.",
      texto: hipossuficiencia,
    },
    {
      key: "meu_inss",
      titulo: "Termo de Autorização de Acesso ao Meu INSS",
      descricao: "Autorização de uso de senha, protocolos e canais digitais.",
      texto: meuInss,
    },
  ];
}

/* ---------- Exportação / impressão ---------- */

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Converte texto simples (ou markdown leve) em HTML no padrão ABNT/judiciário. */
export function textoParaHtml(titulo: string, texto: string) {
  const linhas = texto.replace(/\r/g, "").split("\n");
  const corpo = linhas
    .map((l) => {
      const t = l.trim();
      if (!t) return '<p class="b">&nbsp;</p>';
      const limpo = escapeHtml(t.replace(/^#{1,6}\s*/, "").replace(/\*\*/g, ""));
      const isTitulo =
        /^#{1,6}\s/.test(t) ||
        (limpo.length < 90 && limpo === limpo.toUpperCase() && /[A-ZÀ-Ú]/.test(limpo));
      if (isTitulo) return `<p class="t">${limpo}</p>`;
      if (/^_{5,}$/.test(limpo)) return `<p class="c">${limpo}</p>`;
      return `<p class="b">${limpo}</p>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">
<title>${escapeHtml(titulo)}</title>
<style>
@page { size: A4; margin: 3cm 2cm 2cm 3cm; }
body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.5; text-align: justify; color: #000; }
p.b { text-indent: 1.25cm; margin: 0 0 6pt 0; }
p.t { text-align: center; font-weight: bold; text-indent: 0; margin: 12pt 0; text-transform: uppercase; }
p.c { text-align: center; text-indent: 0; margin: 0; }
</style></head><body>
${corpo}
</body></html>`;
}

export function baixarComoWord(titulo: string, texto: string) {
  const html = textoParaHtml(titulo, texto);
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${titulo.replace(/[^\w\sÀ-ú-]/g, "").slice(0, 80).trim() || "documento"}.doc`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function imprimirDocumento(titulo: string, texto: string) {
  const html = textoParaHtml(titulo, texto);
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export async function copiarTexto(texto: string) {
  await navigator.clipboard.writeText(texto);
}
