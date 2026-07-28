import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BookOpen, Plus, Search, Trash2, Sparkles, Loader2, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { indexarDocumento, indexarPendentes } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca — Assistente Previdenciário" }] }),
  component: BibliotecaPage,
});

const TIPOS = ["Lei", "Decreto", "Instrução Normativa", "Súmula", "Acórdão", "Tema Repetitivo", "Portaria", "Outro"];
const MATERIAS = [
  "Aposentadoria por idade",
  "Aposentadoria por tempo de contribuição",
  "Aposentadoria especial",
  "Aposentadoria PCD",
  "Auxílio-doença",
  "Aposentadoria por invalidez",
  "BPC/LOAS",
  "Salário-maternidade",
  "Geral / Reforma da Previdência",
];

function BibliotecaPage() {
  const qc = useQueryClient();
  const indexarFn = useServerFn(indexarDocumento);
  const indexarPendentesFn = useServerFn(indexarPendentes);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<null | { titulo: string; conteudo: string; tipo: string; fonte: string | null }>(null);
  const [busca, setBusca] = useState("");
  const [indexingId, setIndexingId] = useState<string | null>(null);
  const [indexingAll, setIndexingAll] = useState(false);
  const [form, setForm] = useState({ titulo: "", tipo: "", materia: "", fonte: "", conteudo: "", data_documento: "" });

  const docs = useQuery({
    queryKey: ["documentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const chunksInfo = useQuery({
    queryKey: ["chunks-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documento_chunks").select("documento_id");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const r of data ?? []) map.set(r.documento_id, (map.get(r.documento_id) ?? 0) + 1);
      return map;
    },
  });

  const submit = async () => {
    if (!form.titulo || !form.tipo || !form.conteudo) {
      return toast.error("Preencha título, tipo e conteúdo.");
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("documentos").insert({
      user_id: user.user.id,
      titulo: form.titulo,
      tipo: form.tipo,
      materia: form.materia || null,
      fonte: form.fonte || null,
      conteudo: form.conteudo,
      data_documento: form.data_documento || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Documento adicionado à biblioteca");
    setOpen(false);
    setForm({ titulo: "", tipo: "", materia: "", fonte: "", conteudo: "", data_documento: "" });
    qc.invalidateQueries({ queryKey: ["documentos"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este documento?")) return;
    const { error } = await supabase.from("documentos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["documentos"] });
  };

  const filtered = docs.data?.filter((d) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      d.titulo.toLowerCase().includes(q) ||
      d.conteudo.toLowerCase().includes(q) ||
      d.tipo.toLowerCase().includes(q) ||
      d.materia?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 overflow-y-auto max-h-screen">
      <header className="flex items-center justify-between mb-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-4xl font-serif">Biblioteca Jurídica</h1>
          <p className="text-muted-foreground mt-1">
            Suas leis, decretos, súmulas e decisões previdenciárias.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" /> Adicionar documento
        </Button>
      </header>

      <div className="max-w-6xl mx-auto mb-6 relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Buscar em toda a biblioteca..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered?.map((d) => (
          <Card key={d.id} className="p-5 hover:border-accent transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewing(d)}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="outline">{d.tipo}</Badge>
                  {d.materia && <Badge variant="secondary">{d.materia}</Badge>}
                </div>
                <h3 className="font-serif text-lg mb-1">{d.titulo}</h3>
                {d.fonte && <p className="text-xs text-muted-foreground">{d.fonte}</p>}
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {d.conteudo.slice(0, 200)}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(d.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
        {!filtered?.length && (
          <Card className="p-12 text-center col-span-2">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl mb-2">
              {busca ? "Nenhum resultado" : "Biblioteca vazia"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Adicione leis, súmulas e decisões que você usa com frequência.
            </p>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Adicionar à biblioteca</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex: Lei 8.213/91 — Art. 48 (aposentadoria por idade)"
              />
            </div>
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
                <Label>Matéria</Label>
                <Select value={form.materia} onValueChange={(v) => setForm({ ...form, materia: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {MATERIAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fonte</Label>
                <Input
                  value={form.fonte}
                  onChange={(e) => setForm({ ...form, fonte: e.target.value })}
                  placeholder="STJ, Planalto, INSS..."
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.data_documento}
                  onChange={(e) => setForm({ ...form, data_documento: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Conteúdo (texto completo ou trechos relevantes) *</Label>
              <Textarea
                rows={10}
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                placeholder="Cole aqui o texto da lei, ementa, artigos, súmula..."
              />
            </div>
            <Button onClick={submit} className="w-full" size="lg">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{viewing?.titulo}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <>
              <div className="flex gap-2 flex-wrap mb-4">
                <Badge variant="outline">{viewing.tipo}</Badge>
                {viewing.fonte && <Badge variant="secondary">{viewing.fonte}</Badge>}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 p-6 rounded-md">
                {viewing.conteudo}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
