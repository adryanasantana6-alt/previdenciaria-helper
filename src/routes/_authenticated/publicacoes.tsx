import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Newspaper, Search, Loader2, Copy, ExternalLink } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { buscarPublicacoes } from "@/lib/djen.functions";
import {
  buscarPublicacoesNoNavegador,
  advogadosItem,
  dataItem,
  limparHtml,
  processoItem,
  type DjenFiltro,
  type DjenItem,
} from "@/lib/djen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/publicacoes")({
  head: () => ({
    meta: [
      { title: "Publicações DJEN — Assistente Previdenciário" },
      {
        name: "description",
        content:
          "Consulte intimações e publicações oficiais do Diário de Justiça Eletrônico Nacional por OAB, processo ou parte.",
      },
      { property: "og:title", content: "Publicações DJEN — Assistente Previdenciário" },
      {
        property: "og:description",
        content: "Intimações e publicações oficiais do DJEN filtradas por OAB, processo ou parte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicacoesPage,
});

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

function hoje(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

const STORAGE_KEY = "djen-filtros";

function PublicacoesPage() {
  const buscarServidor = useServerFn(buscarPublicacoes);
  const [filtro, setFiltro] = useState<DjenFiltro>({
    numeroOab: "",
    ufOab: "SP",
    numeroProcesso: "",
    nomeParte: "",
    dataInicio: hoje(-30),
    dataFim: hoje(),
    pagina: 1,
    itensPorPagina: 20,
  });
  const [carregando, setCarregando] = useState(false);
  const [itens, setItens] = useState<DjenItem[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
      try {
        const p = JSON.parse(salvo) as Partial<DjenFiltro>;
        setFiltro((f) => ({ ...f, numeroOab: p.numeroOab ?? "", ufOab: p.ufOab ?? f.ufOab }));
      } catch {
        /* ignora */
      }
    }
  }, []);

  const set = (patch: Partial<DjenFiltro>) => setFiltro((f) => ({ ...f, ...patch }));

  async function buscar(pagina = 1) {
    if (!filtro.numeroOab && !filtro.numeroProcesso && !filtro.nomeParte) {
      toast.error("Informe ao menos OAB, número do processo ou nome da parte.");
      return;
    }
    setCarregando(true);
    const consulta = { ...filtro, pagina };
    try {
      let resp = await buscarServidor({ data: consulta });
      if (resp.erro || !resp.items) {
        // A API do CNJ restringe acessos fora do Brasil: tenta direto pelo navegador.
        resp = await buscarPublicacoesNoNavegador(consulta);
      }
      setItens(resp.items ?? []);
      setTotal(resp.count ?? resp.items?.length ?? 0);
      set({ pagina });
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ numeroOab: filtro.numeroOab, ufOab: filtro.ufOab }),
      );
      if (!resp.items?.length) toast.info("Nenhuma publicação encontrada para esses filtros.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao consultar o DJEN.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AppLayout>
      <div className="h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <header className="flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-primary" />
            <div>
              <h1 className="font-serif text-2xl">Publicações & Intimações (DJEN)</h1>
              <p className="text-sm text-muted-foreground">
                Consulta oficial ao Diário de Justiça Eletrônico Nacional — API Comunica PJe/CNJ.
              </p>
            </div>
          </header>

          <Card className="p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Número da OAB</Label>
                <Input
                  value={filtro.numeroOab ?? ""}
                  onChange={(e) => set({ numeroOab: e.target.value })}
                  placeholder="123456"
                />
              </div>
              <div className="space-y-1.5">
                <Label>UF da OAB</Label>
                <Select value={filtro.ufOab} onValueChange={(v) => set({ ufOab: v })}>
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
              <div className="space-y-1.5">
                <Label>De</Label>
                <Input
                  type="date"
                  value={filtro.dataInicio ?? ""}
                  onChange={(e) => set({ dataInicio: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Até</Label>
                <Input
                  type="date"
                  value={filtro.dataFim ?? ""}
                  onChange={(e) => set({ dataFim: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Número do processo (opcional)</Label>
                <Input
                  value={filtro.numeroProcesso ?? ""}
                  onChange={(e) => set({ numeroProcesso: e.target.value })}
                  placeholder="0000000-00.0000.0.00.0000"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nome da parte (opcional)</Label>
                <Input
                  value={filtro.nomeParte ?? ""}
                  onChange={(e) => set({ nomeParte: e.target.value })}
                  placeholder="Ex.: Maria da Silva"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => buscar(1)} disabled={carregando}>
                {carregando ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Buscar publicações
              </Button>
            </div>
          </Card>

          {itens && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {total} publicação(ões) encontrada(s) — página {filtro.pagina}
              </div>

              {itens.map((item, idx) => {
                const texto = limparHtml(item.texto);
                return (
                  <Card key={`${item.id ?? idx}`} className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{item.siglaTribunal ?? "—"}</Badge>
                      {item.tipoComunicacao && <Badge variant="outline">{item.tipoComunicacao}</Badge>}
                      <span className="text-sm font-medium">{processoItem(item)}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{dataItem(item)}</span>
                    </div>
                    {item.nomeOrgao && (
                      <div className="text-xs text-muted-foreground">{item.nomeOrgao}</div>
                    )}
                    {advogadosItem(item) && (
                      <div className="text-xs text-muted-foreground">
                        Advogado(s): {advogadosItem(item)}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {texto}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void navigator.clipboard.writeText(texto);
                          toast.success("Texto copiado");
                        }}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Copiar
                      </Button>
                      {item.link && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={item.link} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            Abrir no tribunal
                          </a>
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}

              {itens.length > 0 && (
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    disabled={carregando || (filtro.pagina ?? 1) <= 1}
                    onClick={() => buscar((filtro.pagina ?? 1) - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    disabled={carregando || itens.length < (filtro.itensPorPagina ?? 20)}
                    onClick={() => buscar((filtro.pagina ?? 1) + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
