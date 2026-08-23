ALTER TABLE public.casos
  ADD COLUMN IF NOT EXISTS prazo_tipo text,
  ADD COLUMN IF NOT EXISTS prazo_data date,
  ADD COLUMN IF NOT EXISTS prazo_obs text;

UPDATE public.casos SET fase = CASE fase
  WHEN 'juntando_documentacao' THEN 'atendimento_documentos'
  WHEN 'requerimento' THEN 'requerimento_inss'
  WHEN 'fase_judicial' THEN 'judicial'
  WHEN 'acompanhar_processo' THEN 'judicial'
  ELSE fase END;

ALTER TABLE public.casos ALTER COLUMN fase SET DEFAULT 'atendimento_documentos';