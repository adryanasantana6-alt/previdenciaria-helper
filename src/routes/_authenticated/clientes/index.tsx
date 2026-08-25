import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Users,
  Loader2,
  KanbanSquare,
  AlarmClock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  FileText,
  Wand2,
  Eye,
  EyeOff,
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
import { extrairDadosCliente } from "@/lib/ai.functions";
import {
  PASTAS,
  ehImagem,
  fileToDataUrl,
  textoSeguro,
  uploadArquivoCliente,
  tamanhoLegivel,
} from "@/lib/cliente-arquivos";
import { FASES, faseLabel, dataBR, brl, diasRestantes, prazoStatus, prazoTipoLabel } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Segurados & Funil Previdenciário" },
      { name: "description", content: "Lista de segurados, funil previdenciário por fases e controle de prazos e exigências do INSS." },
      { property: "og:title", content: "Segurados & Funil Previdenciário" },
      { property: "og:description", content: "CRM previdenciário: segurados, funil de fases e prazos críticos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientesPage,
});

const emptyForm = {
  nome: "",
  cpf: "",
  rg: "",
  nit: "",
  data_nascimento: "",
  telefone: "",
  email: "",
  endereco: "",
  estado_civil: "",
  profissao: "",
  observacoes: "",
};

type CasoRow = {
  id: string;
  titulo: string;
  fase: string;
  status: string;
  materia: string | null;
  tipo_beneficio: string | null;
  numero_beneficio: string | null;
  numero_processo: string | null;
  der: string | null;
  honorarios: number | null;
  prazo_tipo: string | null;
  prazo_data: string | null;
  prazo_obs: string | null;
  cliente_id: string;
  clientes: { id: string; nome: string; cpf: string | null } | null;
};

function ClientesPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, cpf, telefone, email, created_at, casos(id, titulo, fase, status)")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const casos = useQuery({
    queryKey: ["casos-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casos")
        .select(
          "id, titulo, fase, status, materia, tipo_beneficio, numero_beneficio, numero_processo, der, honorarios, prazo_tipo, prazo_data, prazo_obs, cliente_id, clientes(id, nome, cpf)",
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CasoRow[];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const payload = { ...form, data_nascimento: form.data_nascimento || null, user_id: auth.user.id };
      const { error } = await supabase.from("clientes").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Segurado cadastrado.");
      setForm(emptyForm);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const termo = busca.trim().toLowerCase();
  const lista = (clientes.data ?? []).filter(
    (c) =>
      !termo ||
      c.nome.toLowerCase().includes(termo) ||
      (c.cpf ?? "").toLowerCase().includes(termo) ||
      (c.telefone ?? "").toLowerCase().includes(termo),
  );

  const field = (key: keyof typeof emptyForm, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="p-8 mx-auto overflow-y-auto max-h-screen w-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-4xl font-serif text-foreground">Segurados</h1>
          <p className="text-muted-foreground mt-2">
            Lista de segurados, funil previdenciário e prazos críticos.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Novo segurado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Novo segurado</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">{field("nome", "Nome completo")}</div>
              {field("cpf", "CPF")}
              {field("rg", "RG")}
              {field("nit", "NIT / PIS")}
              {field("data_nascimento", "Data de nascimento", "date")}
              {field("telefone", "Telefone")}
              {field("email", "E-mail", "email")}
              {field("estado_civil", "Estado civil")}
              {field("profissao", "Profissão")}
              <div className="md:col-span-2">{field("endereco", "Endereço")}</div>
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="obs">Observações</Label>
                <Textarea
                  id="obs"
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => criar.mutate()} disabled={!form.nome.trim() || criar.isPending}>
                {criar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar segurado
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <Tabs defaultValue="lista" className="max-w-7xl mx-auto">
        <TabsList>
          <TabsTrigger value="lista">
            <Users className="w-4 h-4 mr-2" /> Lista de segurados
          </TabsTrigger>
          <TabsTrigger value="funil">
            <KanbanSquare className="w-4 h-4 mr-2" /> Funil previdenciário
          </TabsTrigger>
          <TabsTrigger value="prazos">
            <AlarmClock className="w-4 h-4 mr-2" /> Prazos & Exigências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="pt-6">
          <div className="relative mb-6">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou telefone…"
              className="pl-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {clientes.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : lista.length === 0 ? (
            <Card className="p-10 text-center">
              <Users className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum segurado encontrado. Use “Novo segurado” para começar.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lista.map((c) => {
                const ativos = (c.casos ?? []).filter((k) => k.status !== "encerrado");
                return (
                  <Link key={c.id} to="/clientes/$clienteId" params={{ clienteId: c.id }}>
                    <Card className="p-5 h-full hover:border-accent transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-serif text-xl">{c.nome}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {c.cpf ? `CPF ${c.cpf}` : "CPF não informado"} · {c.telefone || "sem telefone"}
                          </p>
                        </div>
                        <Badge variant="secondary">{ativos.length} demanda(s)</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {ativos.slice(0, 3).map((k) => (
                          <Badge key={k.id} variant="outline" className="text-xs">
                            {faseLabel(k.fase)}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Cadastrado em {dataBR(c.created_at.slice(0, 10))}
                      </p>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="funil" className="pt-6">
          <Funil casos={casos.data ?? []} loading={casos.isLoading} />
        </TabsContent>

        <TabsContent value="prazos" className="pt-6">
          <Prazos casos={casos.data ?? []} loading={casos.isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------- Funil (Kanban) ------------------------- */

function Funil({ casos, loading }: { casos: CasoRow[]; loading: boolean }) {
  const qc = useQueryClient();

  const mover = useMutation({
    mutationFn: async ({ id, fase }: { id: string; fase: string }) => {
      const { error } = await supabase
        .from("casos")
        .update({ fase, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fase atualizada.");
      qc.invalidateQueries({ queryKey: ["casos-todos"] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["dashboard-crm"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Carregando funil…</p>;
  if (!casos.length)
    return (
      <Card className="p-10 text-center">
        <KanbanSquare className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhuma demanda cadastrada. Abra a ficha de um segurado e crie uma demanda.
        </p>
      </Card>
    );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {FASES.map((f, idx) => {
        const col = casos.filter((c) => c.fase === f.value);
        const total = col.reduce((s, c) => s + Number(c.honorarios ?? 0), 0);
        return (
          <div key={f.value} className="min-w-[280px] w-[280px] shrink-0">
            <div className="mb-3 px-1">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base">{f.label}</h3>
                <Badge variant="secondary">{col.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{brl(total)} estimados</p>
            </div>
            <div className="space-y-3">
              {col.map((c) => (
                <CasoCard
                  key={c.id}
                  caso={c}
                  faseIdx={idx}
                  onMover={(fase) => mover.mutate({ id: c.id, fase })}
                />
              ))}
              {!col.length && (
                <div className="border border-dashed border-border rounded-md p-4 text-center text-xs text-muted-foreground">
                  Vazio
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CasoCard({
  caso,
  faseIdx,
  onMover,
}: {
  caso: CasoRow;
  faseIdx: number;
  onMover: (fase: string) => void;
}) {
  const navigate = useNavigate();
  const dias = diasRestantes(caso.prazo_data);
  const st = prazoStatus(dias);
  const tone =
    st.tone === "danger"
      ? "bg-destructive/15 text-destructive"
      : st.tone === "warn"
        ? "bg-accent/20 text-accent-foreground"
        : "bg-muted text-muted-foreground";

  return (
    <Card className="p-3 space-y-2">
      <Link to="/clientes/$clienteId" params={{ clienteId: caso.cliente_id }}>
        <p className="font-medium text-sm leading-tight hover:text-accent transition-colors">
          {caso.clientes?.nome ?? "Segurado"}
        </p>
      </Link>
      <p className="text-xs text-muted-foreground leading-snug">{caso.titulo}</p>
      <div className="flex flex-wrap gap-1">
        {caso.materia && <Badge variant="outline" className="text-[10px]">{caso.materia}</Badge>}
        {caso.numero_beneficio && (
          <Badge variant="outline" className="text-[10px]">NB {caso.numero_beneficio}</Badge>
        )}
      </div>
      {caso.honorarios ? (
        <p className="text-xs text-muted-foreground">Honorários: {brl(Number(caso.honorarios))}</p>
      ) : null}
      {caso.prazo_data && (
        <div className={`text-[11px] px-2 py-1 rounded ${tone}`}>
          {prazoTipoLabel(caso.prazo_tipo)} · {dataBR(caso.prazo_data)} · {st.label}
        </div>
      )}
      <div className="flex items-center gap-1 pt-1">
        <Button
          size="sm"
          variant="ghost"
          className="px-2"
          disabled={faseIdx === 0}
          onClick={() => onMover(FASES[faseIdx - 1].value)}
          title="Fase anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="px-2"
          disabled={faseIdx === FASES.length - 1}
          onClick={() => onMover(FASES[faseIdx + 1].value)}
          title="Próxima fase"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="px-2 ml-auto"
          title="Gerar peça com IA"
          onClick={() =>
            navigate({ to: "/pecas", search: { clienteId: caso.cliente_id, casoId: caso.id } })
          }
        >
          <Sparkles className="w-4 h-4 text-accent" />
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------- Prazos ------------------------- */

function Prazos({ casos, loading }: { casos: CasoRow[]; loading: boolean }) {
  const comPrazo = casos
    .filter((c) => c.prazo_data && c.status !== "encerrado")
    .sort((a, b) => (a.prazo_data! < b.prazo_data! ? -1 : 1));

  const grupos = [
    { titulo: "Vencidos", filtro: (d: number) => d < 0 },
    { titulo: "Próximos 7 dias", filtro: (d: number) => d >= 0 && d <= 7 },
    { titulo: "Próximos 30 dias", filtro: (d: number) => d > 7 && d <= 30 },
    { titulo: "Mais adiante", filtro: (d: number) => d > 30 },
  ];

  if (loading) return <p className="text-sm text-muted-foreground">Carregando prazos…</p>;

  if (!comPrazo.length)
    return (
      <Card className="p-10 text-center">
        <AlarmClock className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhum prazo cadastrado. Na ficha do segurado, edite a demanda e informe o tipo e a data do
          prazo (exigência INSS 30 dias, recurso CRPS, intimação judicial…).
        </p>
      </Card>
    );

  return (
    <div className="space-y-8">
      {grupos.map((g) => {
        const itens = comPrazo.filter((c) => g.filtro(diasRestantes(c.prazo_data)!));
        if (!itens.length) return null;
        return (
          <section key={g.titulo}>
            <h3 className="font-serif text-xl mb-3">
              {g.titulo} <span className="text-muted-foreground text-sm">({itens.length})</span>
            </h3>
            <div className="space-y-2">
              {itens.map((c) => {
                const dias = diasRestantes(c.prazo_data);
                const st = prazoStatus(dias);
                return (
                  <Link
                    key={c.id}
                    to="/clientes/$clienteId"
                    params={{ clienteId: c.cliente_id }}
                  >
                    <Card className="p-4 flex flex-wrap items-center gap-3 hover:border-accent transition-colors">
                      <div className="flex-1 min-w-[220px]">
                        <p className="font-medium text-sm">{c.clientes?.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.titulo} · {faseLabel(c.fase)}
                        </p>
                        {c.prazo_obs && (
                          <p className="text-xs text-muted-foreground mt-1">{c.prazo_obs}</p>
                        )}
                      </div>
                      <Badge variant="outline">{prazoTipoLabel(c.prazo_tipo)}</Badge>
                      <div className="text-sm">{dataBR(c.prazo_data)}</div>
                      <Badge
                        variant={st.tone === "danger" ? "destructive" : "secondary"}
                        className="whitespace-nowrap"
                      >
                        {st.label}
                      </Badge>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
