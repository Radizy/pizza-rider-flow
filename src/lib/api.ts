// Lovable Cloud API configuration
import { supabase } from "@/integrations/supabase/client";

export type Unidade = 'ITAQUA' | 'POA' | 'SUZANO';
export type Status = 'disponivel' | 'chamado' | 'entregando';
export type TipoBag = 'normal' | 'metro';

export interface DiasTrabalho {
  dom: boolean;
  seg: boolean;
  ter: boolean;
  qua: boolean;
  qui: boolean;
  sex: boolean;
  sab: boolean;
}

export interface Entregador {
  id: string;
  nome: string;
  telefone: string;
  unidade: Unidade;
  status: Status;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  fila_posicao?: string;
  dias_trabalho?: DiasTrabalho;
  usar_turno_padrao?: boolean;
  turno_inicio?: string;
  turno_fim?: string;
  hora_saida?: string;
  tipo_bag?: TipoBag;
}

export interface CreateEntregadorData {
  nome: string;
  telefone: string;
  unidade: Unidade;
  status: Status;
  ativo: boolean;
  dias_trabalho?: DiasTrabalho;
  usar_turno_padrao?: boolean;
  turno_inicio?: string;
  turno_fim?: string;
}

export interface HistoricoEntrega {
  id: string;
  entregador_id: string;
  unidade: string;
  hora_saida: string;
  hora_retorno?: string;
  tipo_bag?: TipoBag;
  created_at: string;
}

// Turno padrão do sistema (16:00 às 02:00)
export const TURNO_PADRAO = {
  inicio: '16:00:00',
  fim: '02:00:00',
};

// Horário do expediente para histórico (17:00 às 02:00)
export const HORARIO_EXPEDIENTE = {
  inicio: 17,
  fim: 2,
};

// Verifica se o horário atual está dentro do turno
export function isWithinShift(turnoInicio: string, turnoFim: string): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [inicioHour, inicioMinute] = turnoInicio.split(':').map(Number);
  const [fimHour, fimMinute] = turnoFim.split(':').map(Number);
  
  const inicioTime = inicioHour * 60 + inicioMinute;
  const fimTime = fimHour * 60 + fimMinute;

  // Turno que atravessa a meia-noite (ex: 16:00 às 02:00)
  if (fimTime < inicioTime) {
    return currentTime >= inicioTime || currentTime <= fimTime;
  }
  
  // Turno normal (ex: 08:00 às 17:00)
  return currentTime >= inicioTime && currentTime <= fimTime;
}

// Verifica se hoje é um dia de trabalho
export function isWorkDay(diasTrabalho: DiasTrabalho): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, etc.
  
  const dayMap: Record<number, keyof DiasTrabalho> = {
    0: 'dom',
    1: 'seg',
    2: 'ter',
    3: 'qua',
    4: 'qui',
    5: 'sex',
    6: 'sab',
  };
  
  return diasTrabalho[dayMap[dayOfWeek]] ?? true;
}

// Verifica se o entregador deve aparecer na fila
export function shouldShowInQueue(entregador: Entregador): boolean {
  if (!entregador.ativo) return false;
  
  // Verificar dias de trabalho
  const diasTrabalho = entregador.dias_trabalho || {
    dom: true, seg: true, ter: true, qua: true, qui: true, sex: true, sab: true
  };
  
  if (!isWorkDay(diasTrabalho)) return false;
  
  // Verificar turno
  const turnoInicio = entregador.usar_turno_padrao !== false 
    ? TURNO_PADRAO.inicio 
    : (entregador.turno_inicio || TURNO_PADRAO.inicio);
  const turnoFim = entregador.usar_turno_padrao !== false 
    ? TURNO_PADRAO.fim 
    : (entregador.turno_fim || TURNO_PADRAO.fim);
  
  if (!isWithinShift(turnoInicio, turnoFim)) return false;
  
  return true;
}

// Função removida - failsafe de 1 hora não mais necessário

// Fetch all entregadores with optional filters
export async function fetchEntregadores(filters?: {
  unidade?: Unidade;
  status?: Status;
  ativo?: boolean;
}): Promise<Entregador[]> {
  let query = supabase
    .from('entregadores')
    .select('id, nome, telefone, status, unidade, ativo, created_at, updated_at, fila_posicao, dias_trabalho, usar_turno_padrao, turno_inicio, turno_fim, hora_saida, tipo_bag')
    .order('fila_posicao', { ascending: true });

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

  return (data || []) as unknown as Entregador[];
}

// Create new entregador
export async function createEntregador(data: CreateEntregadorData): Promise<Entregador> {
  const insertData: Record<string, unknown> = {
    nome: data.nome,
    telefone: data.telefone,
    unidade: data.unidade,
    status: data.status,
    ativo: data.ativo,
    usar_turno_padrao: data.usar_turno_padrao,
    turno_inicio: data.turno_inicio,
    turno_fim: data.turno_fim,
  };

  if (data.dias_trabalho) {
    insertData.dias_trabalho = data.dias_trabalho;
  }

  const { data: result, error } = await supabase
    .from('entregadores')
    .insert(insertData as { nome: string; telefone: string; unidade: string })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create entregador: ' + error.message);
  }

  return result as unknown as Entregador;
}

// Update entregador
export async function updateEntregador(
  id: string,
  data: Partial<Entregador>
): Promise<Entregador> {
  const updateData: Record<string, unknown> = {};
  
  // Copy all properties except dias_trabalho
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'dias_trabalho') {
      updateData[key] = value;
    }
  });

  // Handle dias_trabalho separately to avoid type issues
  if (data.dias_trabalho !== undefined) {
    updateData.dias_trabalho = data.dias_trabalho;
  }
  
  const { data: result, error } = await supabase
    .from('entregadores')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update entregador: ' + error.message);
  }

  return result as unknown as Entregador;
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

// Send WhatsApp message via Edge Function
export async function sendWhatsAppMessage(
  telefone: string,
  message: string
): Promise<void> {
  const { error } = await supabase.functions.invoke('send-whatsapp', {
    body: { telefone, message },
  });

  if (error) {
    console.error('Failed to send WhatsApp message:', error);
    throw new Error('Failed to send WhatsApp message');
  }
}

// Histórico de entregas
export async function fetchHistoricoEntregas(filters: {
  unidade: Unidade;
  dataInicio: string;
  dataFim: string;
}): Promise<HistoricoEntrega[]> {
  const { data, error } = await supabase
    .from('historico_entregas')
    .select('*')
    .eq('unidade', filters.unidade)
    .gte('hora_saida', filters.dataInicio)
    .lte('hora_saida', filters.dataFim)
    .order('hora_saida', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch historico: ' + error.message);
  }

  return (data || []) as HistoricoEntrega[];
}

export async function createHistoricoEntrega(data: {
  entregador_id: string;
  unidade: string;
  tipo_bag?: TipoBag;
}): Promise<HistoricoEntrega> {
  const { data: result, error } = await supabase
    .from('historico_entregas')
    .insert({
      entregador_id: data.entregador_id,
      unidade: data.unidade,
      hora_saida: new Date().toISOString(),
      tipo_bag: data.tipo_bag || 'normal',
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create historico: ' + error.message);
  }

  return result as HistoricoEntrega;
}

export async function updateHistoricoEntrega(
  id: string,
  data: Partial<HistoricoEntrega>
): Promise<HistoricoEntrega> {
  const { data: result, error } = await supabase
    .from('historico_entregas')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update historico: ' + error.message);
  }

  return result as HistoricoEntrega;
}

export async function deleteOldHistorico(unidade: Unidade): Promise<void> {
  // Limpa histórico do dia anterior às 12:00
  const now = new Date();
  if (now.getHours() >= 12) {
    // Calcula o início do expediente de ontem (17:00)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(17, 0, 0, 0);

    const { error } = await supabase
      .from('historico_entregas')
      .delete()
      .eq('unidade', unidade)
      .lt('hora_saida', yesterday.toISOString());

    if (error) {
      console.error('Failed to delete old historico:', error);
    }
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

// Buscar posição do motoboy na fila
export async function getMotoboyPosition(telefone: string, unidade: Unidade): Promise<{
  position: number | null;
  nome: string | null;
  status: Status | null;
}> {
  const entregadores = await fetchEntregadores({ unidade, ativo: true });
  
  // Filtrar apenas os que devem aparecer na fila
  const activeQueue = entregadores
    .filter(e => shouldShowInQueue(e) && e.status === 'disponivel');
  
  const entregador = entregadores.find(e => e.telefone === telefone);
  
  if (!entregador) {
    return { position: null, nome: null, status: null };
  }
  
  if (entregador.status !== 'disponivel') {
    return { position: null, nome: entregador.nome, status: entregador.status };
  }
  
  const position = activeQueue.findIndex(e => e.id === entregador.id) + 1;
  
  return { 
    position: position > 0 ? position : null, 
    nome: entregador.nome, 
    status: entregador.status 
  };
}
