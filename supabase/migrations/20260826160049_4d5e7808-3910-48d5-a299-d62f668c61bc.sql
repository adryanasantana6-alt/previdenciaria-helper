CREATE TABLE public.djen_config (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_oab text,
  uf_oab text,
  auto_sync boolean NOT NULL DEFAULT true,
  dias_retroativos integer NOT NULL DEFAULT 15,
  ultima_sincronizacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.djen_config TO authenticated;
GRANT ALL ON public.djen_config TO service_role;
ALTER TABLE public.djen_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own djen_config" ON public.djen_config FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_djen_config_updated BEFORE UPDATE ON public.djen_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.intimacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  caso_id uuid REFERENCES public.casos(id) ON DELETE SET NULL,
  djen_id text NOT NULL,
  numero_processo text,
  tribunal text,
  orgao text,
  tipo_comunicacao text,
  texto text NOT NULL DEFAULT '',
  data_disponibilizacao date,
  link text,
  advogados text,
  fase text NOT NULL DEFAULT 'nova',
  prazo_data date,
  responsavel text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, djen_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intimacoes TO authenticated;
GRANT ALL ON public.intimacoes TO service_role;
ALTER TABLE public.intimacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own intimacoes" ON public.intimacoes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_intimacoes_updated BEFORE UPDATE ON public.intimacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_intimacoes_user_fase ON public.intimacoes(user_id, fase);
CREATE INDEX idx_intimacoes_data ON public.intimacoes(user_id, data_disponibilizacao DESC);