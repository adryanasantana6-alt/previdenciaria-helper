ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS govbr_usuario text,
  ADD COLUMN IF NOT EXISTS govbr_senha text;

ALTER TABLE public.cliente_documentos
  ADD COLUMN IF NOT EXISTS pasta text,
  ADD COLUMN IF NOT EXISTS arquivo_nome text,
  ADD COLUMN IF NOT EXISTS mime text,
  ADD COLUMN IF NOT EXISTS tamanho bigint;

CREATE POLICY "own cliente arquivos select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cliente-arquivos' AND owner = auth.uid());
CREATE POLICY "own cliente arquivos insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cliente-arquivos' AND owner = auth.uid() AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own cliente arquivos update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cliente-arquivos' AND owner = auth.uid());
CREATE POLICY "own cliente arquivos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cliente-arquivos' AND owner = auth.uid());