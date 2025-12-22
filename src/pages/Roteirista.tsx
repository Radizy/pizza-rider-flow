import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { Layout, BackButton } from '@/components/Layout';
import { QueueCard } from '@/components/QueueCard';
import {
  fetchEntregadores,
  updateEntregador,
  sendWhatsAppMessage,
  Entregador,
} from '@/lib/api';
import { toast } from 'sonner';
import { Users, Loader2, AlertCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Roteirista() {
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();
  
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [selectedEntregador, setSelectedEntregador] = useState<Entregador | null>(null);
  const [deliveryCount, setDeliveryCount] = useState('1');
  const [isSending, setIsSending] = useState(false);

  // Redirect if no unit selected
  if (!selectedUnit) {
    return <Navigate to="/" replace />;
  }

  // Query for fetching available entregadores
  const { data: entregadores = [], isLoading } = useQuery({
    queryKey: ['entregadores', selectedUnit, 'active'],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit, ativo: true }),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Mutation for updating status
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Entregador> }) =>
      updateEntregador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const openCallDialog = (entregador: Entregador) => {
    setSelectedEntregador(entregador);
    setDeliveryCount('1');
    setCallDialogOpen(true);
  };

  const handleConfirmCall = async () => {
    if (!selectedEntregador) return;
    
    const count = parseInt(deliveryCount) || 1;
    setIsSending(true);
    
    try {
      // Update status to "chamado"
      await updateMutation.mutateAsync({
        id: selectedEntregador.id,
        data: { status: 'chamado' },
      });

      // Send WhatsApp message with delivery count
      const message = count === 1 
        ? `🍕 Sua vez na unidade ${selectedUnit}! Você tem 1 entrega. Vá ao balcão.`
        : `🍕 Sua vez na unidade ${selectedUnit}! Você tem ${count} entregas. Vá ao balcão.`;
      
      await sendWhatsAppMessage(selectedEntregador.telefone, message);

      toast.success(`${selectedEntregador.nome} foi chamado com ${count} entrega(s)!`);
      setCallDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao chamar entregador');
    } finally {
      setIsSending(false);
    }
  };

  const handleReturn = async (entregador: Entregador) => {
    try {
      await updateMutation.mutateAsync({
        id: entregador.id,
        data: { status: 'disponivel' },
      });

      toast.success(`${entregador.nome} voltou para a fila!`);
    } catch (error) {
      toast.error('Erro ao registrar retorno');
    }
  };

  // Filter by status for display
  const availableQueue = entregadores.filter((e) => e.status === 'disponivel');
  const calledQueue = entregadores.filter((e) => e.status === 'chamado');
  const deliveringQueue = entregadores.filter((e) => e.status === 'entregando');

  return (
    <Layout>
      <BackButton />

      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono mb-2">Roteirista</h1>
        <p className="text-muted-foreground">
          Controle da fila de entregas •{' '}
          <span className="font-semibold text-foreground">{selectedUnit}</span>
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-status-available" />
            <span className="text-sm text-muted-foreground">Na fila</span>
          </div>
          <p className="text-3xl font-bold font-mono">{availableQueue.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-status-called animate-pulse" />
            <span className="text-sm text-muted-foreground">Chamados</span>
          </div>
          <p className="text-3xl font-bold font-mono">{calledQueue.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-status-delivering" />
            <span className="text-sm text-muted-foreground">Entregando</span>
          </div>
          <p className="text-3xl font-bold font-mono">{deliveringQueue.length}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Called Section */}
          {calledQueue.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-accent" />
                Chamados Aguardando
              </h2>
              <div className="space-y-3">
                {calledQueue.map((entregador, index) => (
                  <QueueCard
                    key={entregador.id}
                    entregador={entregador}
                    position={index + 1}
                    isLoading={updateMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Delivering Section */}
          {deliveringQueue.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-status-delivering" />
                Em Entrega
              </h2>
              <div className="space-y-3">
                {deliveringQueue.map((entregador, index) => (
                  <QueueCard
                    key={entregador.id}
                    entregador={entregador}
                    position={index + 1}
                    onReturn={() => handleReturn(entregador)}
                    isLoading={updateMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Available Queue */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Fila de Disponíveis
            </h2>
            {availableQueue.length === 0 ? (
              <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum entregador disponível</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableQueue.map((entregador, index) => (
                  <QueueCard
                    key={entregador.id}
                    entregador={entregador}
                    position={index + 1}
                    onCall={() => openCallDialog(entregador)}
                    isLoading={updateMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">Chamar Entregador</DialogTitle>
          </DialogHeader>
          
          {selectedEntregador && (
            <div className="space-y-4 py-4">
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Entregador</p>
                <p className="text-lg font-semibold">{selectedEntregador.nome}</p>
                <p className="text-sm text-muted-foreground">{selectedEntregador.telefone}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deliveryCount">Quantas entregas?</Label>
                <Input
                  id="deliveryCount"
                  type="number"
                  min="1"
                  max="10"
                  value={deliveryCount}
                  onChange={(e) => setDeliveryCount(e.target.value)}
                  className="text-2xl font-mono text-center h-14"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCallDialogOpen(false)}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmCall}
              disabled={isSending}
              className="bg-accent hover:bg-accent/90"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Confirmar Chamada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
