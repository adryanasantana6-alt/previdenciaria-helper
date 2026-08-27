import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Loader2, RefreshCw, Settings2, ExternalLink, Copy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  FASES,
  carregarConfig,
  labelFase,
  sincronizarIntimacoes,
  type DjenConfig,
  type Intimacao,
} from "@/lib/intimacoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/intimacoes")({
  head: () => ({
    meta: [
      { title: "Intimações — Assistente Previdenciário" },
      {
        name: "description",
        content:
          "Painel Kanban de intimações do DJEN com atualização diária automática, prazos e acompanhamento do tratamento.",
      },
      { property: "og:title", content: "Intimações — Assistente Previdenciário" },
      {
        property: "og:description",
        content: "Kanban de intimações do DJEN com sincronização diária automática e controle de prazos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntimacoesPage,
});

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

function IntimacoesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [config, setConfig] = useState<DjenConfig | null>(null);
  const [itens, setItens] = useState<Intimacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [abrirConfig, setAbrirConfig] = useState(false);
  const [form, setForm] = useState({ numero_oab: "", uf_oab: "SP", auto_sync: true, dias_retroativos: 15 });
  const [detalhe, setDetalhe] = useState<Intimacao | null>(null);

  const carregar = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("intimacoes")
      .select("*")
      .eq("user_id", uid)
      .order("data_disponibilizacao", { ascending: false });
    setItens((data ?? []) as Intimacao[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const cfg = await carregarConfig(uid);
      setConfig(cfg);
      if (cfg) {
        setForm({
          numero_oab: cfg.numero_oab ?? "",
          uf_oab: cfg.uf_oab ?? "SP",
          auto_sync: cfg.auto_sync,
          dias_retroativos: cfg.dias_retroativos,
        });
      } else {
        setAbrirConfig(true);
      }
      await carregar(uid);
      setCarregando(false);
    })();
  }, [carregar]);

  async function salvarConfig() {
    if (!userId) return;
    const payload = {
      user_id: userId,
      numero_oab: form.numero_oab.replace(/\D/g, ""),
      uf_oab: form.uf_oab,
      auto_sync: form.auto_sync,
      dias_retroativos: Number(form.dias_retroativos) || 15,
    };
    const { error } = await supabase.from("djen_config").upsert(payload, { onConflict: "user_id" });
    if (error) {
      toast.error("Não foi possível salvar a configuração.");
      return;
    }
    setConfig({ ...payload, ultima_sincronizacao: config?.ultima_sincronizacao ?? null });
    setAbrirConfig(false);
    toast.success("Configuração salva.");
  }

  async function sincronizar() {
    if (!userId) return;
    setSincronizando(true);
    try {
      const r = await sincronizarIntimacoes(userId, { forcar: true });
      if (r.motivo === "sem-oab") {
        toast.error("Cadastre sua OAB para sincronizar.");
        setAbrirConfig(true);
      } else {
        toast.success(
          r.novas ? `${r.novas} nova(s) intimação(ões) importada(s).` : "Nenhuma intimação nova.",
        );
        await carregar(userId);
        setConfig(await carregarConfig(userId));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao consultar o DJEN.");
    } finally {
      setSincronizando(false);
    }
  }

  async function mover(item: Intimacao, fase: string) {
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, fase } : i)));
    const { error } = await supabase.from("intimacoes").update({ fase }).eq("id", item.id);
    if (error) toast.error("Não foi possível mover a intimação.");
  }

  async function atualizarDetalhe(patch: Partial<Intimacao>) {
    if (!detalhe) return;
    const novo = { ...detalhe, ...patch };
    setDetalhe(novo);
    setItens((prev) => prev.map((i) => (i.id === novo.id ? novo : i)));
    await supabase.from("intimacoes").update(patch).eq("id", novo.id);
  }

  return (
    <div className="h-screen overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        <header className="flex flex-wrap items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <div className="flex-1 min-w-[220px]">
            <h1 className="font-serif text-2xl">Intimações</h1>
            <p className="text-sm text-muted-foreground">
              Atualização diária automática do DJEN
              {config?.ultima_sincronizacao
                ? ` — última em ${new Date(config.ultima_sincronizacao).toLocaleString("pt-BR")}`
                : " — ainda não sincronizado"}
            </p>
          </div>
          <Button variant="outline" onClick={() => setAbrirConfig(true)}>
            <Settings2 className="w-4 h-4 mr-2" />
            Configurar OAB
          </Button>
          <Button onClick={sincronizar} disabled={sincronizando}>
            {sincronizando ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Atualizar agora
          </Button>
        </header>

        {carregando ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {FASES.map((fase) => {
              const coluna = itens.filter((i) => i.fase === fase.id);
              return (
                <div
                  key={fase.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("text/plain");
                    const item = itens.find((i) => i.id === id);
                    if (item && item.fase !== fase.id) void mover(item, fase.id);
                  }}
                  className="bg-muted/40 rounded-lg p-3 space-y-3 min-h-[200px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{fase.label}</span>
                    <Badge variant="secondary">{coluna.length}</Badge>
                  </div>

                  {coluna.map((item) => (
                    <Card
                      key={item.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                      onClick={() => setDetalhe(item)}
                      className="p-3 space-y-2 cursor-pointer hover:border-primary transition-colors"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {item.tribunal ?? "—"}
                        </Badge>
                        {item.prazo_data && (
                          <Badge className="text-[10px]">
                            Prazo {new Date(`${item.prazo_data}T12:00`).toLocaleDateString("pt-BR")}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs font-medium break-all">{item.numero_processo ?? "—"}</div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{item.texto}</p>
                      <div className="text-[10px] text-muted-foreground">
                        {item.data_disponibilizacao
                          ? new Date(`${item.data_disponibilizacao}T12:00`).toLocaleDateString("pt-BR")
                          : ""}
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={abrirConfig} onOpenChange={setAbrirConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronização automática do DJEN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Número da OAB</Label>
                <Input
                  value={form.numero_oab}
                  onChange={(e) => setForm({ ...form, numero_oab: e.target.value })}
                  placeholder="123456"
                />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Select value={form.uf_oab} onValueChange={(v) => setForm({ ...form, uf_oab: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dias retroativos por busca</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={form.dias_retroativos}
                onChange={(e) => setForm({ ...form, dias_retroativos: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Atualizar ao abrir o aplicativo</div>
                <div className="text-xs text-muted-foreground">Uma vez por dia, automaticamente.</div>
              </div>
              <Switch
                checked={form.auto_sync}
                onCheckedChange={(v) => setForm({ ...form, auto_sync: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={salvarConfig}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {detalhe?.numero_processo ?? "Intimação"}
            </DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{detalhe.tribunal ?? "—"}</Badge>
                {detalhe.tipo_comunicacao && <Badge variant="outline">{detalhe.tipo_comunicacao}</Badge>}
                <span>{detalhe.orgao}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Fase</Label>
                  <Select value={detalhe.fase} onValueChange={(v) => void atualizarDetalhe({ fase: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FASES.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Prazo fatal</Label>
                  <Input
                    type="date"
                    value={detalhe.prazo_data ?? ""}
                    onChange={(e) => void atualizarDetalhe({ prazo_data: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Responsável</Label>
                  <Input
                    value={detalhe.responsavel ?? ""}
                    onChange={(e) => void atualizarDetalhe({ responsavel: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Anotações do tratamento</Label>
                <Textarea
                  rows={3}
                  value={detalhe.observacoes ?? ""}
                  onChange={(e) => void atualizarDetalhe({ observacoes: e.target.value })}
                  placeholder="Providências, contato com o cliente, documentos pendentes…"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Teor da publicação</Label>
                <p className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/40 rounded-md p-3">
                  {detalhe.texto}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(detalhe.texto);
                    toast.success("Texto copiado");
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copiar
                </Button>
                {detalhe.link && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={detalhe.link} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Abrir no tribunal
                    </a>
                  </Button>
                )}
                <span className="ml-auto text-xs text-muted-foreground self-center">
                  {labelFase(detalhe.fase)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
