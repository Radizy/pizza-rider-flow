// Directus API configuration
const DIRECTUS_URL = 'https://dom-directus.bxsvmp.easypanel.host';

// Evolution API configuration
const EVOLUTION_URL = 'https://dom-evolution-api.bxsvmp.easypanel.host';
const EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const EVOLUTION_INSTANCE = 'pizzaria';

export type Unidade = 'ITAQUA' | 'POA' | 'SUZANO';
export type Status = 'disponivel' | 'chamado' | 'entregando';

export interface Entregador {
  id: number;
  nome: string;
  telefone: string;
  unidade: Unidade;
  status: Status;
  ativo: boolean;
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
  const params = new URLSearchParams();
  params.append('fields', 'id,nome,telefone,status,unidade,ativo');

  if (filters) {
    const filterObj: Record<string, unknown> = {};
    if (filters.unidade) filterObj.unidade = { _eq: filters.unidade };
    if (filters.status) filterObj.status = { _eq: filters.status };
    if (filters.ativo !== undefined) filterObj.ativo = { _eq: filters.ativo };
    
    if (Object.keys(filterObj).length > 0) {
      params.append('filter', JSON.stringify(filterObj));
    }
  }

  const response = await fetch(`${DIRECTUS_URL}/items/entregadores?${params.toString()}`, {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch entregadores');
  }

  const data = await response.json();
  return data.data || [];
}

// Create new entregador
export async function createEntregador(data: CreateEntregadorData): Promise<Entregador> {
  const response = await fetch(`${DIRECTUS_URL}/items/entregadores`, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nome: data.nome,
      telefone: data.telefone,
      unidade: data.unidade,
      status: data.status,
      ativo: data.ativo,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create entregador');
  }

  const result = await response.json();
  return result.data;
}

// Update entregador
export async function updateEntregador(
  id: number,
  data: Partial<Entregador>
): Promise<Entregador> {
  const response = await fetch(`${DIRECTUS_URL}/items/entregadores/${id}`, {
    method: 'PATCH',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update entregador');
  }

  const result = await response.json();
  return result.data;
}

// Delete entregador
export async function deleteEntregador(id: number): Promise<void> {
  const response = await fetch(`${DIRECTUS_URL}/items/entregadores/${id}`, {
    method: 'DELETE',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete entregador');
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
