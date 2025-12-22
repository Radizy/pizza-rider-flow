-- Add fila_posicao column for queue ordering
ALTER TABLE public.entregadores 
ADD COLUMN fila_posicao TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing records to use created_at as initial fila_posicao
UPDATE public.entregadores 
SET fila_posicao = created_at;