import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildDjenUrl, type DjenFiltro, type DjenResposta } from "@/lib/djen";

export const buscarPublicacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DjenFiltro) => input)
  .handler(async ({ data }): Promise<DjenResposta & { erro?: string }> => {
    try {
      const resp = await fetch(buildDjenUrl(data), { headers: { Accept: "application/json" } });
      const texto = await resp.text();
      if (!resp.ok) {
        return { erro: `DJEN respondeu ${resp.status}`, items: [], count: 0 };
      }
      try {
        return JSON.parse(texto) as DjenResposta;
      } catch {
        return { erro: "Resposta inválida do DJEN", items: [], count: 0 };
      }
    } catch (e) {
      return { erro: e instanceof Error ? e.message : "Falha ao consultar o DJEN", items: [], count: 0 };
    }
  });
