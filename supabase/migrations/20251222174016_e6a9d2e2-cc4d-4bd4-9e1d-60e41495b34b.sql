-- Create entregadores table
CREATE TABLE public.entregadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  unidade TEXT NOT NULL CHECK (unidade IN ('ITAQUA', 'POA', 'SUZANO')),
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'chamado', 'entregando')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.entregadores ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (anyone can view)
CREATE POLICY "Anyone can view entregadores" 
ON public.entregadores 
FOR SELECT 
USING (true);

-- Create policy for public insert access
CREATE POLICY "Anyone can create entregadores" 
ON public.entregadores 
FOR INSERT 
WITH CHECK (true);

-- Create policy for public update access
CREATE POLICY "Anyone can update entregadores" 
ON public.entregadores 
FOR UPDATE 
USING (true);

-- Create policy for public delete access
CREATE POLICY "Anyone can delete entregadores" 
ON public.entregadores 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_entregadores_updated_at
BEFORE UPDATE ON public.entregadores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for entregadores table
ALTER PUBLICATION supabase_realtime ADD TABLE public.entregadores;