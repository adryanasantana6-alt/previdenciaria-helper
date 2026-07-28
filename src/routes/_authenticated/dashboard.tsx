import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, FileText, BookOpen, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Assistente Previdenciário" }] }),
  component: Dashboard,
});

function Dashboard() {
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [conversas, pecas, docs] = await Promise.all([
        supabase.from("conversas").select("*", { count: "exact", head: true }),
        supabase.from("pecas").select("*", { count: "exact", head: true }),
        supabase.from("documentos").select("*", { count: "exact", head: true }),
      ]);
      return {
        conversas: conversas.count ?? 0,
        pecas: pecas.count ?? 0,
        docs: docs.count ?? 0,
      };
    },
  });

  const recentes = useQuery({
    queryKey: ["dashboard-recentes"],
    queryFn: async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("conversas").select("id, titulo, updated_at").order("updated_at", { ascending: false }).limit(5),
        supabase.from("pecas").select("id, titulo, tipo, updated_at").order("updated_at", { ascending: false }).limit(5),
      ]);
      return { conversas: c ?? [], pecas: p ?? [] };
    },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto overflow-y-auto max-h-screen">
      <header className="mb-10">
        <h1 className="text-4xl font-serif text-foreground">Bem-vinda, Dra. Adriana</h1>
        <p className="text-muted-foreground mt-2">
          Seu painel de trabalho para casos previdenciários.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Link to="/chat">
          <Card className="p-6 hover:border-accent transition-colors cursor-pointer group h-full">
            <MessageSquare className="w-8 h-8 text-accent mb-3" />
            <h3 className="font-serif text-xl mb-1">Consultar IA</h3>
            <p className="text-sm text-muted-foreground">
              Tire dúvidas sobre benefícios, requisitos e jurisprudência.
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              {stats.data?.conversas ?? 0} conversas
            </div>
          </Card>
        </Link>

        <Link to="/pecas">
          <Card className="p-6 hover:border-accent transition-colors cursor-pointer group h-full">
            <FileText className="w-8 h-8 text-accent mb-3" />
            <h3 className="font-serif text-xl mb-1">Gerar Peça</h3>
            <p className="text-sm text-muted-foreground">
              Requerimentos, recursos e petições prontas para revisão.
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              {stats.data?.pecas ?? 0} peças criadas
            </div>
          </Card>
        </Link>

        <Link to="/biblioteca">
          <Card className="p-6 hover:border-accent transition-colors cursor-pointer group h-full">
            <BookOpen className="w-8 h-8 text-accent mb-3" />
            <h3 className="font-serif text-xl mb-1">Biblioteca</h3>
            <p className="text-sm text-muted-foreground">
              Suas leis, súmulas e decisões importantes.
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              {stats.data?.docs ?? 0} documentos
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-serif text-lg mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent" /> Conversas recentes
          </h3>
          {recentes.data?.conversas.length ? (
            <ul className="space-y-2">
              {recentes.data.conversas.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/chat"
                    search={{ id: c.id }}
                    className="block p-2 rounded hover:bg-muted text-sm"
                  >
                    {c.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-serif text-lg mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> Peças recentes
          </h3>
          {recentes.data?.pecas.length ? (
            <ul className="space-y-2">
              {recentes.data.pecas.map((p) => (
                <li key={p.id} className="p-2 rounded hover:bg-muted text-sm">
                  <div className="font-medium">{p.titulo}</div>
                  <div className="text-xs text-muted-foreground">{p.tipo}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma peça gerada ainda.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
