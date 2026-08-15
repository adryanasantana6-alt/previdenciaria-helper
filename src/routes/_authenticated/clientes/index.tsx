import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { faseLabel, dataBR } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Assistente Previdenciário" },
      { name: "description", content: "Cadastro de clientes, casos, pagamentos e guias previdenciárias." },
      { property: "og:title", content: "Clientes — Assistente Previdenciário" },
      { property: "og:description", content: "Gestão de clientes e demandas previdenciárias." },
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

  const criar = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const payload = {
        ...form,
        data_nascimento: form.data_nascimento || null,
        user_id: auth.user.id,
      };
      const { error } = await supabase.from("clientes").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado.");
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
      (c.cpf ?? "").toLowerCase().includes(termo),
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
    <div className="p-8 max-w-6xl mx-auto overflow-y-auto max-h-screen">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-2">
            Dados pessoais, demandas, documentos, pagamentos e guias previdenciárias.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Novo cliente</DialogTitle>
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
              <Button
                onClick={() => criar.mutate()}
                disabled={!form.nome.trim() || criar.isPending}
              >
                {criar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar cliente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CPF…"
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
            Nenhum cliente cadastrado ainda. Use “Novo cliente” para começar.
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
                    <Badge variant="secondary">{ativos.length} caso(s)</Badge>
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
    </div>
  );
}
