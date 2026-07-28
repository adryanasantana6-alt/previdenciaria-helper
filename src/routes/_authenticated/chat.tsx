import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Plus, MessageSquare, Loader2 } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { sendChatMessage } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Consultor IA — Assistente Previdenciário" }] }),
  validateSearch: searchSchema,
  component: ChatPage,
});

const MATERIAS = [
  "Aposentadoria por idade",
  "Aposentadoria por tempo de contribuição",
  "Aposentadoria especial",
  "Aposentadoria PCD",
  "Regras de transição EC 103/2019",
  "Auxílio-doença",
  "Auxílio-acidente",

  "Aposentadoria por invalidez",
  "BPC/LOAS",
  "Salário-maternidade",
  "Revisão de benefício",
  "Recurso administrativo (CRPS)",
  "Recurso judicial",
];

function ChatPage() {
  const { id } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const sendFn = useServerFn(sendChatMessage);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [materia, setMateria] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const conversas = useQuery({
    queryKey: ["conversas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversas")
        .select("id, titulo, materia, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const mensagens = useQuery({
    queryKey: ["mensagens", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("mensagens")
        .select("id, role, content, created_at")
        .eq("conversa_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens.data, sending]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [id]);

  const novaConversa = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data, error } = await supabase
      .from("conversas")
      .insert({ user_id: user.user.id, titulo: "Nova conversa", materia: materia || null })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["conversas"] });
    navigate({ search: { id: data.id } });
  };

  const enviar = async () => {
    if (!input.trim() || sending) return;
    let convId = id;
    if (!convId) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data, error } = await supabase
        .from("conversas")
        .insert({ user_id: user.user.id, titulo: input.slice(0, 60), materia: materia || null })
        .select("id")
        .single();
      if (error) return toast.error(error.message);
      convId = data.id;
      navigate({ search: { id: convId } });
    }
    const content = input;
    setInput("");
    setSending(true);
    try {
      await sendFn({ data: { conversaId: convId!, content } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["mensagens", convId] }),
        qc.invalidateQueries({ queryKey: ["conversas"] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar mensagem");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="flex h-screen">
      {/* Lista de conversas */}
      <div className="w-72 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b">
          <Button onClick={novaConversa} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Nova conversa
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversas.data?.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ search: { id: c.id } })}
              className={cn(
                "w-full text-left p-3 rounded-md hover:bg-muted text-sm transition-colors",
                id === c.id && "bg-muted",
              )}
            >
              <div className="font-medium truncate flex items-center gap-2">
                <MessageSquare className="w-3 h-3 flex-shrink-0" />
                {c.titulo}
              </div>
              {c.materia && (
                <div className="text-xs text-muted-foreground mt-1 truncate">{c.materia}</div>
              )}
            </button>
          ))}
          {!conversas.data?.length && (
            <p className="text-xs text-muted-foreground p-4 text-center">
              Suas conversas aparecerão aqui.
            </p>
          )}
        </div>
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        <header className="p-4 border-b flex items-center gap-3 bg-card">
          <div>
            <h2 className="font-serif text-lg">Consultor Previdenciário</h2>
            <p className="text-xs text-muted-foreground">
              IA especializada em previdenciário — sempre confira as citações.
            </p>
          </div>
          <div className="ml-auto">
            <Select value={materia} onValueChange={setMateria}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Matéria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {MATERIAS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {!id && (
            <div className="max-w-2xl mx-auto text-center py-20">
              <h3 className="font-serif text-3xl mb-4">Como posso ajudar hoje?</h3>
              <p className="text-muted-foreground mb-6">
                Pergunte sobre requisitos, cálculos, jurisprudência ou estratégias para o seu caso.
              </p>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  "Quais os requisitos para aposentadoria por idade após a EC 103/2019?",
                  "Como calcular a RMI de aposentadoria por incapacidade permanente?",
                  "Requisitos do BPC/LOAS para pessoa com deficiência",
                  "Prazo para recurso ao CRPS e efeitos da tempestividade",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="p-3 rounded-md border hover:border-accent hover:bg-muted text-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mensagens.data?.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <Card
                className={cn(
                  "max-w-3xl p-4",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                <div className="text-xs opacity-70 mb-2 font-medium">
                  {m.role === "user" ? "Você" : "Consultor IA"}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
              </Card>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <Card className="max-w-3xl p-4 bg-card">
                <div className="text-xs opacity-70 mb-2 font-medium">Consultor IA</div>
                <Loader2 className="w-4 h-4 animate-spin" />
              </Card>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-card">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
              placeholder="Pergunte sobre o caso... (Enter para enviar, Shift+Enter para nova linha)"
              className="min-h-[60px] resize-none"
              disabled={sending}
            />
            <Button onClick={enviar} disabled={sending || !input.trim()} size="lg">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
