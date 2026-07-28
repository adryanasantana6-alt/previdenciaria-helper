import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Loader2, Download, Sparkles, Paperclip, X, Upload } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { gerarPeca } from "@/lib/ai.functions";
import { extractFileText } from "@/lib/extract-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/pecas")({
  head: () => ({ meta: [{ title: "Peças & Recursos — Assistente Previdenciário" }] }),
  component: PecasPage,
});

const TIPOS = [
  "Requerimento administrativo INSS",
  "Recurso ao CRPS",
  "Petição inicial (Vara Federal)",
  "Petição inicial (JEF)",
  "Recurso inominado",
  "Contrarrazões",
  "Agravo de instrumento",
  "Réplica à contestação",
];

const MATERIAS = [
  "Aposentadoria por idade",
  "Aposentadoria por tempo de contribuição",
  "Aposentadoria especial",
  "Aposentadoria PCD",
  "Auxílio-doença",
  "Auxílio-acidente",
  "Aposentadoria por invalidez",
  "BPC/LOAS",
  "Salário-maternidade",
  "Revisão de benefício",

];

type AnexoDoc = { name: string; size: number; text: string };

function PecasPage() {
  const qc = useQueryClient();
  const gerar = useServerFn(gerarPeca);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<{ titulo: string; conteudo: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("dados");
  const [anexos, setAnexos] = useState<AnexoDoc[]>([]);
  const [extraindo, setExtraindo] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    tipo: "",
    materia: "",
    cliente: "",
    fatos: "",
    pedido: "",
    extras: "",
  });

  const pecas = useQuery({
    queryKey: ["pecas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pecas")
        .select("id, tipo, materia, cliente, titulo, conteudo, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setForm({ tipo: "", materia: "", cliente: "", fatos: "", pedido: "", extras: "" });
    setAnexos([]);
    setTab("dados");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setExtraindo(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name}: excede 25MB.`);
          continue;
        }
        try {
          const text = await extractFileText(file);
          if (!text.trim()) {
            toast.warning(`${file.name}: nenhum texto extraído (PDF pode ser digitalizado sem OCR).`);
            continue;
          }
          setAnexos((prev) => [...prev, { name: file.name, size: file.size, text }]);
          toast.success(`${file.name} anexado (${text.length.toLocaleString("pt-BR")} caracteres).`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : `Erro ao ler ${file.name}`);
        }
      }
    } finally {
      setExtraindo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removerAnexo = (i: number) => setAnexos((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!form.tipo || !form.materia || !form.cliente || !form.fatos || !form.pedido) {
      setTab("dados");
      return toast.error("Preencha todos os campos obrigatórios.");
    }
    setLoading(true);
    try {
      const documentosAnexos = anexos
        .map((a) => `--- ARQUIVO: ${a.name} ---\n${a.text}`)
        .join("\n\n");
      const res = await gerar({ data: { ...form, documentosAnexos } });
      toast.success("Peça gerada com sucesso!");
      qc.invalidateQueries({ queryKey: ["pecas"] });
      setOpen(false);
      const titulo = `${form.tipo} — ${form.cliente}`;
      resetForm();
      setViewing({ titulo, conteudo: res.conteudo });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar peça");
    } finally {
      setLoading(false);
    }
  };


  const download = (titulo: string, conteudo: string) => {
    const blob = new Blob([conteudo], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titulo.replace(/[^\w\s-]/g, "").slice(0, 80)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 overflow-y-auto max-h-screen">
      <header className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-4xl font-serif">Peças & Recursos</h1>
          <p className="text-muted-foreground mt-1">
            Gere requerimentos, recursos e petições com IA especializada.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="lg">
          <Sparkles className="w-4 h-4 mr-2" /> Nova peça
        </Button>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {pecas.data?.map((p) => (
          <Card key={p.id} className="p-5 hover:border-accent transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-accent font-medium mb-1">
                  <FileText className="w-3 h-3" />
                  {p.tipo}
                </div>
                <h3 className="font-serif text-lg mb-1 truncate">{p.cliente}</h3>
                <p className="text-sm text-muted-foreground">{p.materia}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewing({ titulo: p.titulo, conteudo: p.conteudo })}
              >
                Abrir
              </Button>
              <Button size="sm" variant="ghost" onClick={() => download(p.titulo, p.conteudo)}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
        {!pecas.data?.length && (
          <Card className="p-12 text-center col-span-2">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl mb-2">Nenhuma peça ainda</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Clique em "Nova peça" para gerar o primeiro requerimento ou recurso.
            </p>
          </Card>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Nova peça previdenciária</DialogTitle>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab} className="pt-2">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="dados">Dados do caso</TabsTrigger>
              <TabsTrigger value="anexos">
                Anexos {anexos.length > 0 && <span className="ml-1 text-xs opacity-70">({anexos.length})</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Matéria *</Label>
                  <Select value={form.materia} onValueChange={(v) => setForm({ ...form, materia: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {MATERIAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Cliente (nome completo) *</Label>
                <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
              </div>
              <div>
                <Label>Fatos do caso *</Label>
                <Textarea
                  rows={5}
                  value={form.fatos}
                  onChange={(e) => setForm({ ...form, fatos: e.target.value })}
                  placeholder="Ex: cliente com 62 anos, 20 anos de contribuição, atividade rural comprovada por documentos X e Y..."
                />
              </div>
              <div>
                <Label>Pedido principal *</Label>
                <Textarea
                  rows={3}
                  value={form.pedido}
                  onChange={(e) => setForm({ ...form, pedido: e.target.value })}
                  placeholder="Ex: concessão de aposentadoria por idade rural com DIB na DER"
                />
              </div>
              <div>
                <Label>Informações adicionais</Label>
                <Textarea
                  rows={3}
                  value={form.extras}
                  onChange={(e) => setForm({ ...form, extras: e.target.value })}
                  placeholder="Particularidades, jurisprudência específica a citar..."
                />
              </div>
            </TabsContent>

            <TabsContent value="anexos" className="space-y-4 pt-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4" /> Processo administrativo e documentos
                </Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Anexe o processo administrativo do INSS, CNIS, laudos médicos, decisões, CTPS, PPP etc.
                  O texto é extraído e enviado à IA para fundamentar a peça com dados reais (DER, DIB, NB, motivos de indeferimento…).
                  Formatos: <strong>PDF, DOCX, TXT</strong>. Máx. 25 MB por arquivo.
                </p>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                  }}
                  className="border-2 border-dashed border-border rounded-md p-6 text-center hover:border-accent transition-colors cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm">
                    {extraindo ? "Extraindo texto…" : "Clique ou arraste arquivos aqui"}
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.md,application/pdf,text/plain"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>
              </div>

              {anexos.length > 0 && (
                <div className="space-y-2">
                  {anexos.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 p-3 bg-muted/40 rounded-md border border-border"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-accent shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{a.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(a.size / 1024).toFixed(0)} KB · {a.text.length.toLocaleString("pt-BR")} caracteres extraídos
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removerAnexo(i)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Button onClick={submit} disabled={loading || extraindo} className="w-full mt-4" size="lg">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando peça...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Gerar peça {anexos.length > 0 && `com ${anexos.length} anexo(s)`}</>
            )}
          </Button>
        </DialogContent>
      </Dialog>


      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{viewing?.titulo}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 p-6 rounded-md font-mono">
                {viewing.conteudo}
              </div>
              <Button onClick={() => download(viewing.titulo, viewing.conteudo)} variant="outline">
                <Download className="w-4 h-4 mr-2" /> Baixar (.md)
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
