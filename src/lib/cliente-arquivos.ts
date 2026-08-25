import { supabase } from "@/integrations/supabase/client";
import { extractFileText } from "@/lib/extract-text";

export const BUCKET = "cliente-arquivos";

export const PASTAS = [
  "Documentos pessoais",
  "Comprovante de residência",
  "Gov.br / Meu INSS",
  "CNIS e contribuições",
  "Laudos e exames médicos",
  "Relatórios e pareceres",
  "Processo administrativo",
  "Processo judicial",
  "Contratos e procurações",
  "Outros",
] as const;

export function ehImagem(file: File) {
  return file.type.startsWith("image/");
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
    r.readAsDataURL(file);
  });
}

/** Extrai texto quando possível; imagens retornam string vazia. */
export async function textoSeguro(file: File): Promise<string> {
  try {
    if (ehImagem(file)) return "";
    return await extractFileText(file);
  } catch {
    return "";
  }
}

function slug(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-80);
}

export async function uploadArquivoCliente(params: {
  userId: string;
  clienteId: string;
  casoId?: string | null;
  file: File;
  pasta?: string | null;
  conteudo?: string;
}) {
  const { userId, clienteId, file } = params;
  const path = `${userId}/${clienteId}/${Date.now()}-${slug(file.name)}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) throw new Error(`${file.name}: ${upErr.message}`);

  const conteudo = params.conteudo ?? (await textoSeguro(file));

  const { error } = await supabase.from("cliente_documentos").insert({
    user_id: userId,
    cliente_id: clienteId,
    caso_id: params.casoId ?? null,
    nome: file.name,
    categoria: params.pasta ?? null,
    pasta: params.pasta ?? "Outros",
    arquivo_url: path,
    arquivo_nome: file.name,
    mime: file.type || null,
    tamanho: file.size,
    conteudo,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }
  return path;
}

export async function abrirArquivo(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error || !data) throw new Error(error?.message ?? "Não foi possível abrir o arquivo.");
  window.open(data.signedUrl, "_blank", "noopener");
}

export async function baixarArquivo(path: string, nome: string) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? "Não foi possível baixar o arquivo.");
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function tamanhoLegivel(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
