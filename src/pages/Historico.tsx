import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { Layout, BackButton } from '@/components/Layout';
import {
  fetchEntregadores,
  fetchHistoricoEntregas,
  deleteOldHistorico,
  Entregador,
  HistoricoEntrega,
  HORARIO_EXPEDIENTE,
} from '@/lib/api';
import { toast } from 'sonner';
import { History, Download, Loader2, Users, Trash2, Clock } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface EntregadorContagem {
  id: string;
  nome: string;
  telefone: string;
  entregas: number;
}

export default function Historico() {
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();

  // Redirect if no unit selected
  if (!selectedUnit) {
    return <Navigate to="/" replace />;
  }

  // Calcular período do expediente atual (17:00 às 02:00)
  const getExpedientePeriod = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    let dataInicio: Date;
    let dataFim: Date;

    // Se estamos antes das 02:00, o expediente começou ontem às 17:00
    if (currentHour < HORARIO_EXPEDIENTE.fim) {
      dataInicio = new Date(now);
      dataInicio.setDate(dataInicio.getDate() - 1);
      dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);
      
      dataFim = new Date(now);
      dataFim.setHours(HORARIO_EXPEDIENTE.fim, 0, 0, 0);
    } 
    // Se estamos após as 17:00, o expediente começou hoje
    else if (currentHour >= HORARIO_EXPEDIENTE.inicio) {
      dataInicio = new Date(now);
      dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);
      
      dataFim = new Date(now);
      dataFim.setDate(dataFim.getDate() + 1);
      dataFim.setHours(HORARIO_EXPEDIENTE.fim, 0, 0, 0);
    }
    // Entre 02:00 e 17:00 - mostrar expediente de ontem
    else {
      dataInicio = new Date(now);
      dataInicio.setDate(dataInicio.getDate() - 1);
      dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);
      
      dataFim = new Date(now);
      dataFim.setHours(HORARIO_EXPEDIENTE.fim, 0, 0, 0);
    }

    return { dataInicio, dataFim };
  };

  const { dataInicio, dataFim } = getExpedientePeriod();

  // Query for fetching entregadores
  const { data: entregadores = [] } = useQuery({
    queryKey: ['entregadores', selectedUnit],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit }),
  });

  // Query for fetching historico
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['historico', selectedUnit, dataInicio.toISOString()],
    queryFn: () =>
      fetchHistoricoEntregas({
        unidade: selectedUnit,
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
      }),
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Calcular contagem por entregador
  const contagemPorEntregador = useMemo((): EntregadorContagem[] => {
    const contagem: Record<string, number> = {};

    historico.forEach((h) => {
      contagem[h.entregador_id] = (contagem[h.entregador_id] || 0) + 1;
    });

    return entregadores
      .map((e) => ({
        id: e.id,
        nome: e.nome,
        telefone: e.telefone,
        entregas: contagem[e.id] || 0,
      }))
      .sort((a, b) => b.entregas - a.entregas);
  }, [historico, entregadores]);

  const totalEntregas = historico.length;

  // Verificar se pode limpar (após 12:00)
  const canClean = () => {
    const now = new Date();
    return now.getHours() >= 12;
  };

  const handleClean = async () => {
    if (!canClean()) {
      toast.error('A limpeza só pode ser feita após 12:00');
      return;
    }

    if (!confirm('Tem certeza que deseja limpar o histórico de ontem?')) {
      return;
    }

    try {
      await deleteOldHistorico(selectedUnit);
      queryClient.invalidateQueries({ queryKey: ['historico'] });
      toast.success('Histórico limpo com sucesso!');
    } catch (error) {
      toast.error('Erro ao limpar histórico');
    }
  };

  const handleExportExcel = () => {
    // Criar CSV para download
    const headers = ['Nome', 'Telefone', 'Entregas'];
    const rows = contagemPorEntregador.map((e) => [e.nome, e.telefone, e.entregas.toString()]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const dataFormatted = dataInicio.toLocaleDateString('pt-BR').replace(/\//g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `historico-entregas-${selectedUnit}-${dataFormatted}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Arquivo exportado com sucesso!');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <Layout>
      <BackButton />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-mono mb-2">Histórico</h1>
          <p className="text-muted-foreground">
            Contagem de entregas do expediente •{' '}
            <span className="font-semibold text-foreground">{selectedUnit}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {canClean() && (
            <Button variant="outline" onClick={handleClean} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Limpar Ontem
            </Button>
          )}
          <Button onClick={handleExportExcel} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Período */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Período do expediente</p>
            <p className="font-mono font-medium">
              {formatDate(dataInicio)} - {HORARIO_EXPEDIENTE.inicio}:00 às{' '}
              {HORARIO_EXPEDIENTE.fim}:00
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de saídas</p>
              <p className="text-2xl font-bold font-mono">{totalEntregas}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-available/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-status-available" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entregadores ativos</p>
              <p className="text-2xl font-bold font-mono">
                {contagemPorEntregador.filter((e) => e.entregas > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : contagemPorEntregador.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-lg">
          <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl text-muted-foreground mb-2">Nenhum registro encontrado</p>
          <p className="text-sm text-muted-foreground">
            Os registros de entregas aparecerão aqui durante o expediente
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Entregas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contagemPorEntregador.map((entregador, index) => (
                <TableRow key={entregador.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{entregador.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {entregador.telefone}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold font-mono ${
                        entregador.entregas > 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {entregador.entregas}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Layout>
  );
}
