import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { Layout, BackButton } from '@/components/Layout';
import { fetchEntregadores, updateEntregador, Entregador } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Truck, User, CheckCircle, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Checkin() {
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();

  // Redirect if no unit selected
  if (!selectedUnit) {
    return <Navigate to="/" replace />;
  }

  // Query for fetching entregadores who are delivering
  const { data: entregadores = [], isLoading } = useQuery({
    queryKey: ['entregadores', selectedUnit, 'delivering'],
    queryFn: () =>
      fetchEntregadores({ unidade: selectedUnit, ativo: true, status: 'entregando' }),
    refetchInterval: 5000,
  });

  // Mutation for check-in (return to queue)
  const checkinMutation = useMutation({
    mutationFn: (id: string) => updateEntregador(id, { status: 'disponivel' }),
    onSuccess: (_, id) => {
      const entregador = entregadores.find((e) => e.id === id);
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success(`${entregador?.nome} voltou para a fila!`);
    },
    onError: () => {
      toast.error('Erro ao fazer check-in');
    },
  });

  const handleCheckin = (entregador: Entregador) => {
    checkinMutation.mutate(entregador.id);
  };

  return (
    <Layout>
      <BackButton />

      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono mb-2">Check-in</h1>
        <p className="text-muted-foreground">
          Clique no card do entregador para registrar o retorno •{' '}
          <span className="font-semibold text-foreground">{selectedUnit}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="bg-card border border-border rounded-lg p-4 mb-8 inline-flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-status-delivering/10 flex items-center justify-center">
          <Truck className="w-5 h-5 text-status-delivering" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Em entrega</p>
          <p className="text-2xl font-bold font-mono">{entregadores.length}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : entregadores.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-lg">
          <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl text-muted-foreground mb-2">
            Nenhum entregador em rota
          </p>
          <p className="text-sm text-muted-foreground">
            Os entregadores que estão entregando aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entregadores.map((entregador) => (
            <button
              key={entregador.id}
              onClick={() => handleCheckin(entregador)}
              disabled={checkinMutation.isPending}
              className={cn(
                'group relative bg-card border-2 border-status-delivering rounded-xl p-6 text-left transition-all',
                'hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1',
                'active:scale-95',
                checkinMutation.isPending && 'opacity-50 pointer-events-none'
              )}
            >
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-status-delivering/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-status-delivering" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{entregador.nome}</h3>
                  <p className="text-sm text-muted-foreground">{entregador.telefone}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-status-delivering">
                <Truck className="w-4 h-4" />
                <span className="text-sm font-medium">Em entrega</span>
              </div>

              <p className="mt-4 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                Clique para fazer check-in →
              </p>
            </button>
          ))}
        </div>
      )}
    </Layout>
  );
}
