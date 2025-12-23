-- Adicionar colunas para dias de trabalho, turno e hora_saida
ALTER TABLE public.entregadores
ADD COLUMN IF NOT EXISTS dias_trabalho jsonb DEFAULT '{"dom": true, "seg": true, "ter": true, "qua": true, "qui": true, "sex": true, "sab": true}'::jsonb,
ADD COLUMN IF NOT EXISTS usar_turno_padrao boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS turno_inicio time DEFAULT '16:00:00',
ADD COLUMN IF NOT EXISTS turno_fim time DEFAULT '02:00:00',
ADD COLUMN IF NOT EXISTS hora_saida timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tipo_bag text DEFAULT 'normal';

-- Criar tabela de histórico de entregas
CREATE TABLE IF NOT EXISTS public.historico_entregas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entregador_id UUID NOT NULL REFERENCES public.entregadores(id) ON DELETE CASCADE,
  unidade TEXT NOT NULL,
  hora_saida TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  hora_retorno TIMESTAMP WITH TIME ZONE,
  tipo_bag TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.historico_entregas ENABLE ROW LEVEL SECURITY;

-- Policies para historico_entregas
CREATE POLICY "Anyone can view historico_entregas" 
ON public.historico_entregas 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create historico_entregas" 
ON public.historico_entregas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update historico_entregas" 
ON public.historico_entregas 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete historico_entregas" 
ON public.historico_entregas 
FOR DELETE 
USING (true);