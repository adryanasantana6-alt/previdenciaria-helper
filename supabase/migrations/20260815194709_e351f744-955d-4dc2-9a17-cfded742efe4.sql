CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cpf text,
  rg text,
  nit text,
  data_nascimento date,
  telefone text,
  email text,
  endereco text,
  estado_civil text,
  profissao text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clientes" ON public.clientes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_clientes_updated BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_clientes_user ON public.clientes(user_id);

CREATE TABLE public.casos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  tipo_beneficio text,
  materia text,
  numero_processo text,
  numero_beneficio text,
  der date,
  fase text NOT NULL DEFAULT 'juntando_documentacao',
  status text NOT NULL DEFAULT 'ativo',
  honorarios numeric(12,2),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.casos TO authenticated;
GRANT ALL ON public.casos TO service_role;
ALTER TABLE public.casos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own casos" ON public.casos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_casos_updated BEFORE UPDATE ON public.casos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_casos_cliente ON public.casos(cliente_id);

CREATE TABLE public.cliente_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  caso_id uuid REFERENCES public.casos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  categoria text,
  conteudo text NOT NULL DEFAULT '',
  arquivo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_documentos TO authenticated;
GRANT ALL ON public.cliente_documentos TO service_role;
ALTER TABLE public.cliente_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cliente_documentos" ON public.cliente_documentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_clidocs_cliente ON public.cliente_documentos(cliente_id);

CREATE TABLE public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  caso_id uuid REFERENCES public.casos(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  forma text,
  vencimento date,
  data_pagamento date,
  situacao text NOT NULL DEFAULT 'pendente',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pagamentos" ON public.pagamentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_pagamentos_updated BEFORE UPDATE ON public.pagamentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_pagamentos_cliente ON public.pagamentos(cliente_id);

CREATE TABLE public.guias_previdenciarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  competencia text NOT NULL,
  codigo text,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  vencimento date,
  data_pagamento date,
  situacao text NOT NULL DEFAULT 'pendente',
  comprovante_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guias_previdenciarias TO authenticated;
GRANT ALL ON public.guias_previdenciarias TO service_role;
ALTER TABLE public.guias_previdenciarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own guias" ON public.guias_previdenciarias FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tr_guias_updated BEFORE UPDATE ON public.guias_previdenciarias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_guias_cliente ON public.guias_previdenciarias(cliente_id);