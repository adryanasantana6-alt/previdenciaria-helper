import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  FileText,
  Wallet,
  Receipt,
  UserRound,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { extractFileText } from "@/lib/extract-text";
import { FASES, MATERIAS, SITUACOES, brl, dataBR, faseLabel, situacaoLabel } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/clientes/$clienteId")({
  head: () => ({
    meta: [
      { title: "Ficha do cliente — Assistente Previdenciário" },
      { name: "description", content: "Dados, demandas, documentos, pagamentos e guias do cliente." },
      { property: "og:title", content: "Ficha do cliente" },
      { property: "og:description", content: "Gestão completa da demanda previdenciária do cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClienteDetalhe,
});

function ClienteDetalhe() {
  const { clienteId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const cliente = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").eq("id", clienteId).single();
      if (error) throw error;
      return data;
    },
  });

  const invalidate = (k: string) => qc.invalidateQueries({ queryKey: [k, clienteId] });

  if (cliente.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  }
  if (!cliente.data) {
    return <div className="p-8 text-sm text-muted-foreground">Cliente não encontrado.</div>;
  }

  const c = cliente.data;

  const excluirCliente = async () => {
    if (!confirm("Excluir este cliente e todos os seus registros?")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
    if (error) return toast.error(error.message);
    toast.success("Cliente excluído.");
    qc.invalidateQueries({ queryKey: ["clientes"] });
    navigate({ to: "/clientes" });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto overflow-y-auto max-h-screen">
      <Link to="/clientes" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Clientes
      </Link>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif">{c.nome}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {c.cpf ? `CPF ${c.cpf}` : "CPF não informado"} · {c.telefone || "sem telefone"} ·{" "}
            {c.email || "sem e-mail"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={excluirCliente}>
          <Trash2 className="w-4 h-4 mr-2" /> Excluir cliente
        </Button>
      </header>

      <Tabs defaultValue="dados">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="dados">
            <UserRound className="w-4 h-4 mr-1.5" /> Dados
          </TabsTrigger>
          <TabsTrigger value="casos">
            <Briefcase className="w-4 h-4 mr-1.5" /> Demandas
          </TabsTrigger>
          <TabsTrigger value="documentos">
            <FileText className="w-4 h-4 mr-1.5" /> Documentos
          </TabsTrigger>
          <TabsTrigger value="pagamentos">
            <Wallet className="w-4 h-4 mr-1.5" /> Pagamentos
          </TabsTrigger>
          <TabsTrigger value="guias">
            <Receipt className="w-4 h-4 mr-1.5" /> Guias previdenciárias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <DadosTab cliente={c} onSaved={() => cliente.refetch()} />
        </TabsContent>
        <TabsContent value="casos">
          <CasosTab clienteId={clienteId} onChange={() => invalidate("casos")} />
        </TabsContent>
        <TabsContent value="documentos">
          <DocumentosTab clienteId={clienteId} />
        </TabsContent>
        <TabsContent value="pagamentos">
          <PagamentosTab clienteId={clienteId} />
        </TabsContent>
        <TabsContent value="guias">
          <GuiasTab clienteId={clienteId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Dados ---------------- */

const CAMPOS = [
  ["nome", "Nome completo", "text"],
  ["cpf", "CPF", "text"],
  ["rg", "RG", "text"],
  ["nit", "NIT / PIS", "text"],
  ["data_nascimento", "Data de nascimento", "date"],
  ["telefone", "Telefone", "text"],
  ["email", "E-mail", "email"],
  ["estado_civil", "Estado civil", "text"],
  ["profissao", "Profissão", "text"],
  ["endereco", "Endereço", "text"],
] as const;

function DadosTab({ cliente, onSaved }: { cliente: any; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const [k] of CAMPOS) o[k] = cliente[k] ?? "";
    o["observacoes"] = cliente.observacoes ?? "";
    return o;
  });
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("clientes")
      .update({ ...form, data_nascimento: form["data_nascimento"] || null })
      .eq("id", cliente.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Dados atualizados.");
    onSaved();
  };

  return (
    <Card className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CAMPOS.map(([key, label, type]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              type={type}
              value={form[key] ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            rows={4}
            value={form["observacoes"] ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
          />
        </div>
      </div>
      <div className="mt-5">
        <Button onClick={salvar} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar alterações
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- Casos ---------------- */

const casoVazio = {
  titulo: "",
  tipo_beneficio: "",
  materia: "",
  numero_processo: "",
  numero_beneficio: "",
  der: "",
  fase: "juntando_documentacao",
  honorarios: "",
  observacoes: "",
};

function CasosTab({ clienteId, onChange }: { clienteId: string; onChange: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(casoVazio);

  const casos = useQuery({
    queryKey: ["casos", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casos")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("casos").insert({
        ...form,
        der: form.der || null,
        honorarios: form.honorarios ? Number(form.honorarios) : null,
        cliente_id: clienteId,
        user_id: auth.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demanda criada.");
      setForm(casoVazio);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["casos", clienteId] });
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mudarFase = async (id: string, fase: string) => {
    const { error } = await supabase.from("casos").update({ fase }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["casos", clienteId] });
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from("casos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["casos", clienteId] });
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Nova demanda
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Nova demanda</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Título</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex.: Aposentadoria por idade rural"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Matéria</Label>
              <Select value={form.materia} onValueChange={(v) => setForm((f) => ({ ...f, materia: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fase atual</Label>
              <Select value={form.fase} onValueChange={(v) => setForm((f) => ({ ...f, fase: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FASES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de benefício</Label>
              <Input
                value={form.tipo_beneficio}
                onChange={(e) => setForm((f) => ({ ...f, tipo_beneficio: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nº do benefício (NB)</Label>
              <Input
                value={form.numero_beneficio}
                onChange={(e) => setForm((f) => ({ ...f, numero_beneficio: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nº do processo</Label>
              <Input
                value={form.numero_processo}
                onChange={(e) => setForm((f) => ({ ...f, numero_processo: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>DER</Label>
              <Input
                type="date"
                value={form.der}
                onChange={(e) => setForm((f) => ({ ...f, der: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Honorários (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.honorarios}
                onChange={(e) => setForm((f) => ({ ...f, honorarios: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => criar.mutate()} disabled={!form.titulo.trim() || criar.isPending}>
              {criar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar demanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {casos.data?.length ? (
        casos.data.map((k) => (
          <Card key={k.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl">{k.titulo}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {k.materia || "sem matéria"} · NB {k.numero_beneficio || "—"} · Processo{" "}
                  {k.numero_processo || "—"} · DER {dataBR(k.der)}
                </p>
                {k.honorarios != null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Honorários: {brl(Number(k.honorarios))}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={k.fase} onValueChange={(v) => mudarFase(k.id, v)}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FASES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => excluir(k.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {k.observacoes && <p className="text-sm mt-3 whitespace-pre-wrap">{k.observacoes}</p>}
            <Badge variant="secondary" className="mt-3">
              {faseLabel(k.fase)}
            </Badge>
          </Card>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma demanda cadastrada.</p>
      )}
    </div>
  );
}

/* ---------------- Documentos ---------------- */

function DocumentosTab({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const [carregando, setCarregando] = useState(false);
  const [categoria, setCategoria] = useState("");

  const docs = useQuery({
    queryKey: ["cliente_documentos", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_documentos")
        .select("id, nome, categoria, conteudo, created_at")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const enviar = async (files: FileList | null) => {
    if (!files?.length) return;
    setCarregando(true);
    const { data: auth } = await supabase.auth.getUser();
    for (const file of Array.from(files)) {
      try {
        const texto = await extractFileText(file);
        const { error } = await supabase.from("cliente_documentos").insert({
          cliente_id: clienteId,
          user_id: auth.user!.id,
          nome: file.name,
          categoria: categoria || null,
          conteudo: texto,
        });
        if (error) throw error;
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    setCarregando(false);
    qc.invalidateQueries({ queryKey: ["cliente_documentos", clienteId] });
    toast.success("Documentos anexados.");
  };

  const excluir = async (id: string) => {
    await supabase.from("cliente_documentos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["cliente_documentos", clienteId] });
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <div className="space-y-1.5">
          <Label>Categoria (opcional)</Label>
          <Input
            placeholder="Ex.: CNIS, laudo médico, processo administrativo"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Arquivos (PDF, DOCX, TXT)</Label>
          <Input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => enviar(e.target.files)}
          />
        </div>
        {carregando && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Extraindo texto…
          </p>
        )}
      </Card>

      {docs.data?.length ? (
        docs.data.map((d) => (
          <Card key={d.id} className="p-4 flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-sm">{d.nome}</div>
              <div className="text-xs text-muted-foreground">
                {d.categoria || "sem categoria"} · {d.conteudo.length.toLocaleString("pt-BR")} caracteres
                extraídos
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => excluir(d.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
      )}
    </div>
  );
}

/* ---------------- Pagamentos ---------------- */

const pagVazio = {
  descricao: "",
  valor: "",
  forma: "",
  vencimento: "",
  data_pagamento: "",
  situacao: "pendente",
};

function PagamentosTab({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(pagVazio);
  const [open, setOpen] = useState(false);

  const pagamentos = useQuery({
    queryKey: ["pagamentos", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("vencimento", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("pagamentos").insert({
        ...form,
        valor: Number(form.valor || 0),
        vencimento: form.vencimento || null,
        data_pagamento: form.data_pagamento || null,
        cliente_id: clienteId,
        user_id: auth.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm(pagVazio);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["pagamentos", clienteId] });
      toast.success("Pagamento registrado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mudarSituacao = async (id: string, situacao: string) => {
    await supabase
      .from("pagamentos")
      .update({
        situacao,
        data_pagamento: situacao === "pago" ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["pagamentos", clienteId] });
  };

  const excluir = async (id: string) => {
    await supabase.from("pagamentos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["pagamentos", clienteId] });
  };

  const total = (pagamentos.data ?? []).reduce((s, p) => s + Number(p.valor), 0);
  const recebido = (pagamentos.data ?? [])
    .filter((p) => p.situacao === "pago")
    .reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-serif">{brl(total)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Recebido</div>
          <div className="text-2xl font-serif">{brl(recebido)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Em aberto</div>
          <div className="text-2xl font-serif">{brl(total - recebido)}</div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Novo pagamento
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Novo pagamento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex.: Honorários — 1ª parcela"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Forma</Label>
              <Input
                value={form.forma}
                onChange={(e) => setForm((f) => ({ ...f, forma: e.target.value }))}
                placeholder="Pix, cartão, dinheiro…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={form.vencimento}
                onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Situação</Label>
              <Select value={form.situacao} onValueChange={(v) => setForm((f) => ({ ...f, situacao: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITUACOES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => criar.mutate()} disabled={!form.descricao.trim() || criar.isPending}>
              {criar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pagamentos.data?.length ? (
        pagamentos.data.map((p) => (
          <Card key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">{p.descricao}</div>
              <div className="text-xs text-muted-foreground">
                {brl(Number(p.valor))} · vence {dataBR(p.vencimento)} · {p.forma || "forma não informada"}
                {p.data_pagamento ? ` · pago em ${dataBR(p.data_pagamento)}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={p.situacao} onValueChange={(v) => mudarSituacao(p.id, v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITUACOES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => excluir(p.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
      )}
    </div>
  );
}

/* ---------------- Guias previdenciárias ---------------- */

const guiaVazia = {
  competencia: "",
  codigo: "",
  valor: "",
  vencimento: "",
  data_pagamento: "",
  situacao: "pendente",
  observacoes: "",
};

function GuiasTab({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(guiaVazia);
  const [open, setOpen] = useState(false);

  const guias = useQuery({
    queryKey: ["guias", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guias_previdenciarias")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("competencia", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("guias_previdenciarias").insert({
        ...form,
        valor: Number(form.valor || 0),
        vencimento: form.vencimento || null,
        data_pagamento: form.data_pagamento || null,
        cliente_id: clienteId,
        user_id: auth.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm(guiaVazia);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["guias", clienteId] });
      toast.success("Guia registrada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const marcarPaga = async (id: string, situacao: string) => {
    await supabase
      .from("guias_previdenciarias")
      .update({
        situacao,
        data_pagamento: situacao === "pago" ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["guias", clienteId] });
  };

  const excluir = async (id: string) => {
    await supabase.from("guias_previdenciarias").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["guias", clienteId] });
  };

  const pagas = (guias.data ?? []).filter((g) => g.situacao === "pago");

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Contribuições pagas (GPS)</div>
        <div className="text-2xl font-serif">
          {pagas.length} guia(s) · {brl(pagas.reduce((s, g) => s + Number(g.valor), 0))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Nova guia
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Nova guia previdenciária</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Competência</Label>
              <Input
                placeholder="MM/AAAA"
                value={form.competencia}
                onChange={(e) => setForm((f) => ({ ...f, competencia: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Código de pagamento</Label>
              <Input
                placeholder="Ex.: 1163"
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={form.vencimento}
                onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data do pagamento</Label>
              <Input
                type="date"
                value={form.data_pagamento}
                onChange={(e) => setForm((f) => ({ ...f, data_pagamento: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Situação</Label>
              <Select value={form.situacao} onValueChange={(v) => setForm((f) => ({ ...f, situacao: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITUACOES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => criar.mutate()} disabled={!form.competencia.trim() || criar.isPending}>
              {criar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar guia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {guias.data?.length ? (
        guias.data.map((g) => (
          <Card key={g.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">
                Competência {g.competencia} {g.codigo ? `· código ${g.codigo}` : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                {brl(Number(g.valor))} · vence {dataBR(g.vencimento)}
                {g.data_pagamento ? ` · pago em ${dataBR(g.data_pagamento)}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={g.situacao === "pago" ? "default" : "secondary"}>
                {situacaoLabel(g.situacao)}
              </Badge>
              <Select value={g.situacao} onValueChange={(v) => marcarPaga(g.id, v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITUACOES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => excluir(g.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma guia registrada.</p>
      )}
    </div>
  );
}
