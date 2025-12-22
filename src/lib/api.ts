// Lovable Cloud API configuration
import { supabase } from "@/integrations/supabase/client";

// Evolution API configuration (WhatsApp)
const EVOLUTION_URL = 'https://dom-evolution-api.bxsvmp.easypanel.host';
const EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const EVOLUTION_INSTANCE = 'pizzaria';

export type Unidade = 'ITAQUA' | 'POA' | 'SUZANO';
export type Status = 'disponivel' | 'chamado' | 'entregando';

export interface Entregador {
  id: string;
  nome: string;
  telefone: string;
  unidade: Unidade;
  status: Status;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEntregadorData {
  nome: string;
  telefone: string;
  unidade: Unidade;
  status: Status;
  ativo: boolean;
}

// Fetch all entregadores with optional filters
export async function fetchEntregadores(filters?: {
  unidade?: Unidade;
  status?: Status;
  ativo?: boolean;
}): Promise<Entregador[]> {
  let query = supabase
    .from('entregadores')
    .select('id, nome, telefone, status, unidade, ativo, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (filters?.unidade) {
    query = query.eq('unidade', filters.unidade);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.ativo !== undefined) {
    query = query.eq('ativo', filters.ativo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch entregadores: ' + error.message);
  }

  return (data || []) as Entregador[];
}

// Create new entregador
export async function createEntregador(data: CreateEntregadorData): Promise<Entregador> {
  const { data: result, error } = await supabase
    .from('entregadores')
    .insert({
      nome: data.nome,
      telefone: data.telefone,
      unidade: data.unidade,
      status: data.status,
      ativo: data.ativo,
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create entregador: ' + error.message);
  }

  return result as Entregador;
}

// Update entregador
export async function updateEntregador(
  id: string,
  data: Partial<Entregador>
): Promise<Entregador> {
  const { data: result, error } = await supabase
    .from('entregadores')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update entregador: ' + error.message);
  }

  return result as Entregador;
}

// Delete entregador
export async function deleteEntregador(id: string): Promise<void> {
  const { error } = await supabase
    .from('entregadores')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Failed to delete entregador: ' + error.message);
  }
}

// Send WhatsApp message via Evolution API
export async function sendWhatsAppMessage(
  telefone: string,
  message: string
): Promise<void> {
  // Format phone number (remove non-digits and ensure country code)
  let formattedNumber = telefone.replace(/\D/g, '');
  if (!formattedNumber.startsWith('55')) {
    formattedNumber = '55' + formattedNumber;
  }

  const response = await fetch(
    `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
    {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: message,
      }),
    }
  );

  if (!response.ok) {
    console.error('Failed to send WhatsApp message');
  }
}

// Subscribe to realtime changes
export function subscribeToEntregadores(
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel('entregadores-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'entregadores'
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
