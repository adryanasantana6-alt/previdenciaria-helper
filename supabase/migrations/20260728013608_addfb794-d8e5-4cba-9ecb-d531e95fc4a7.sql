
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.documento_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  conteudo text NOT NULL,
  embedding vector(3072) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX documento_chunks_doc_idx ON public.documento_chunks(documento_id);
CREATE INDEX documento_chunks_user_idx ON public.documento_chunks(user_id);
CREATE INDEX documento_chunks_embedding_idx
  ON public.documento_chunks USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documento_chunks TO authenticated;
GRANT ALL ON public.documento_chunks TO service_role;

ALTER TABLE public.documento_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chunks" ON public.documento_chunks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector(3072),
  _user_id uuid,
  match_count int DEFAULT 6
) RETURNS TABLE (
  chunk_id uuid,
  documento_id uuid,
  titulo text,
  tipo text,
  materia text,
  fonte text,
  conteudo text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.documento_id, d.titulo, d.tipo, d.materia, d.fonte, c.conteudo,
    1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
  FROM public.documento_chunks c
  JOIN public.documentos d ON d.id = c.documento_id
  WHERE c.user_id = _user_id
  ORDER BY c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_chunks(vector, uuid, int) TO authenticated;
