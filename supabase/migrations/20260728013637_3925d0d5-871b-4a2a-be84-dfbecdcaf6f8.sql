
DROP FUNCTION IF EXISTS public.match_chunks(vector, uuid, int);

CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector(3072),
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
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT c.id, c.documento_id, d.titulo, d.tipo, d.materia, d.fonte, c.conteudo,
    1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
  FROM public.documento_chunks c
  JOIN public.documentos d ON d.id = c.documento_id
  WHERE c.user_id = auth.uid()
  ORDER BY c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_chunks(vector, int) TO authenticated;
