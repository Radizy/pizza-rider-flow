import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { Layout, BackButton } from '@/components/Layout';
import {
  fetchEntregadores,
  updateEntregador,
  sendWhatsAppMessage,
  createHistoricoEntrega,
  shouldShowInQueue,
  Entregador,
  TipoBag,
} from '@/lib/api';
import { toast } from 'sonner';
import { Users, Loader2, Phone, GripVertical, SkipForward, UserMinus } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export default function Roteirista() {
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();
  
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [selectedEntregador, setSelectedEntregador] = useState<Entregador | null>(null);
  const [deliveryCount, setDeliveryCount] = useState('1');
  const [tipoBag, setTipoBag] = useState<TipoBag>('normal');
  const [skipReason, setSkipReason] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Redirect if no unit selected
  if (!selectedUnit) {
    return <Navigate to="/" replace />;
  }

  // Query for fetching available entregadores
  const { data: entregadores = [], isLoading } = useQuery({
    queryKey: ['entregadores', selectedUnit, 'active'],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit, ativo: true }),
    refetchInterval: 5000,
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

  // Filter by status and shift/workdays for display
  const availableQueue = entregadores
    .filter((e) => e.status === 'disponivel' && shouldShowInQueue(e));
  const calledQueue = entregadores.filter((e) => e.status === 'chamado');
  const deliveringQueue = entregadores.filter((e) => e.status === 'entregando');

  // Próximo da fila
  const nextInQueue = availableQueue[0] || null;
  const secondInQueue = availableQueue[1] || null;

  const openCallDialog = () => {
    if (!nextInQueue) {
      toast.error('Nenhum entregador na fila!');
      return;
    }
    setSelectedEntregador(nextInQueue);
    setDeliveryCount('1');
    setTipoBag('normal');
    setCallDialogOpen(true);
  };

  const handleConfirmCall = async () => {
    if (!selectedEntregador) return;
    
    const count = parseInt(deliveryCount) || 1;
    setIsSending(true);
    
    try {
      // Update status to "chamado" and set tipo_bag
      await updateMutation.mutateAsync({
        id: selectedEntregador.id,
        data: { 
          status: 'chamado',
          tipo_bag: tipoBag,
        },
      });

      // Create historico entry
      await createHistoricoEntrega({
        entregador_id: selectedEntregador.id,
        unidade: selectedUnit,
        tipo_bag: tipoBag,
      });

      // Send WhatsApp message with delivery count and bag type
      const bagMessage = tipoBag === 'metro' 
        ? '🎒 Pegue a BAG METRO' 
        : '🎒 Pegue uma BAG NORMAL';
      
      const message = count === 1 
        ? `🍕 Sua vez na unidade ${selectedUnit}! Você tem 1 entrega. ${bagMessage}. Vá ao balcão.`
        : `🍕 Sua vez na unidade ${selectedUnit}! Você tem ${count} entregas. ${bagMessage}. Vá ao balcão.`;
      
      await sendWhatsAppMessage(selectedEntregador.telefone, message);

      toast.success(`${selectedEntregador.nome} foi chamado com ${count} entrega(s)!`);
      setCallDialogOpen(false);

      // Enviar mensagem para o segundo da fila após 5 segundos
      if (secondInQueue) {
        setTimeout(async () => {
          try {
            const alertMessage = `⚠️ Atenção ${secondInQueue.nome}! Você é o próximo da fila na unidade ${selectedUnit}. Fique alerta!`;
            await sendWhatsAppMessage(secondInQueue.telefone, alertMessage);
            toast.info(`Alerta enviado para ${secondInQueue.nome}`);
          } catch (error) {
            console.error('Erro ao enviar alerta para segundo da fila:', error);
          }
        }, 5000);
      }
    } catch (error) {
      toast.error('Erro ao chamar entregador');
    } finally {
      setIsSending(false);
    }
  };

  // Pular a vez do motoboy (vai para o fim da fila)
  const handleSkipTurn = async () => {
    if (!selectedEntregador || !skipReason.trim()) {
      toast.error('Informe o motivo para pular a vez');
      return;
    }

    try {
      // Move para o fim da fila atualizando fila_posicao
      await updateMutation.mutateAsync({
        id: selectedEntregador.id,
        data: { 
          fila_posicao: new Date().toISOString(),
        },
      });
      
      toast.success(`${selectedEntregador.nome} foi para o fim da fila. Motivo: ${skipReason}`);
      setSkipDialogOpen(false);
      setSkipReason('');
      setSelectedEntregador(null);
    } catch (error) {
      toast.error('Erro ao pular a vez');
    }
  };

  // Remover da fila (desativa temporariamente)
  const handleRemoveFromQueue = async (entregador: Entregador) => {
    try {
      await updateMutation.mutateAsync({
        id: entregador.id,
        data: { 
          ativo: false,
        },
      });
      
      toast.success(`${entregador.nome} foi removido da fila`);
    } catch (error) {
      toast.error('Erro ao remover da fila');
    }
  };

  // Handle drag and drop reorder
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    // Reorder the local array
    const reordered = [...availableQueue];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, removed);

    // Update fila_posicao for all affected entregadores
    const now = new Date();
    const updates = reordered.map((entregador, index) => {
      // Create timestamps that preserve the new order
      const newTimestamp = new Date(now.getTime() + index * 1000).toISOString();
      return updateMutation.mutateAsync({
        id: entregador.id,
        data: { fila_posicao: newTimestamp },
      });
    });

    try {
      await Promise.all(updates);
      toast.success('Ordem da fila atualizada!');
    } catch (error) {
      toast.error('Erro ao reordenar fila');
    }
  };

  return (
    <Layout>
      <BackButton />

      <div className="mb-6">
        <h1 className="text-3xl font-bold font-mono mb-2">Roteirista</h1>
        <p className="text-muted-foreground">
          Controle da fila de entregas •{' '}
          <span className="font-semibold text-foreground">{selectedUnit}</span>
        </p>
      </div>

      {/* Botão Grande CHAMAR O PRÓXIMO */}
      <Button
        onClick={openCallDialog}
        disabled={!nextInQueue || isLoading}
        className="w-full h-24 text-2xl font-bold font-mono mb-8 bg-accent hover:bg-accent/90 text-accent-foreground gap-4"
      >
        <Phone className="w-8 h-8" />
        {nextInQueue ? (
          <>CHAMAR: {nextInQueue.nome.toUpperCase()}</>
        ) : (
          <>NENHUM NA FILA</>
        )}
      </Button>

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
          {/* Available Queue with Drag and Drop */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Fila de Disponíveis ({availableQueue.length})
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (arraste para reordenar)
              </span>
            </h2>
            {availableQueue.length === 0 ? (
              <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum entregador disponível</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="queue">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3"
                    >
                      {availableQueue.map((entregador, index) => (
                        <Draggable
                          key={entregador.id}
                          draggableId={entregador.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-4 bg-card border border-border rounded-xl p-4 transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
                              }`}
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing p-2 hover:bg-secondary rounded-lg"
                              >
                                <GripVertical className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl font-bold font-mono">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-lg font-semibold">{entregador.nome}</p>
                                <p className="text-sm text-muted-foreground">{entregador.telefone}</p>
                              </div>
                              <div className="w-3 h-3 rounded-full bg-status-available" />
                              
                              {/* Dropdown menu para ações */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Ações
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedEntregador(entregador);
                                      setSkipReason('');
                                      setSkipDialogOpen(true);
                                    }}
                                    className="gap-2"
                                  >
                                    <SkipForward className="w-4 h-4" />
                                    Pular a vez
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRemoveFromQueue(entregador)}
                                    className="gap-2 text-destructive"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                    Remover da fila
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>
      )}

      {/* Call Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-2xl">Chamar Entregador</DialogTitle>
          </DialogHeader>
          
          {selectedEntregador && (
            <div className="space-y-4 py-4">
              <div className="bg-accent/20 border-2 border-accent rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Próximo da fila</p>
                <p className="text-3xl font-bold font-mono text-accent">{selectedEntregador.nome}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedEntregador.telefone}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deliveryCount" className="text-lg">Quantas entregas?</Label>
                <Input
                  id="deliveryCount"
                  type="number"
                  min="1"
                  max="10"
                  value={deliveryCount}
                  onChange={(e) => setDeliveryCount(e.target.value)}
                  className="text-4xl font-mono text-center h-20"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-lg">Tipo de BAG</Label>
                <RadioGroup
                  value={tipoBag}
                  onValueChange={(value) => setTipoBag(value as TipoBag)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="bag-normal" />
                    <Label 
                      htmlFor="bag-normal" 
                      className="flex-1 cursor-pointer p-4 border-2 rounded-lg hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                    >
                      <div className="text-center">
                        <span className="text-2xl">🎒</span>
                        <p className="font-semibold mt-1">BAG Normal</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="metro" id="bag-metro" />
                    <Label 
                      htmlFor="bag-metro" 
                      className="flex-1 cursor-pointer p-4 border-2 rounded-lg hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                    >
                      <div className="text-center">
                        <span className="text-2xl">📦</span>
                        <p className="font-semibold mt-1">BAG Metro</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setCallDialogOpen(false)}
              disabled={isSending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmCall}
              disabled={isSending}
              className="flex-1 bg-accent hover:bg-accent/90 text-lg h-12"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              CHAMAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip Dialog */}
      <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-xl">Pular a Vez</DialogTitle>
          </DialogHeader>
          
          {selectedEntregador && (
            <div className="space-y-4 py-4">
              <div className="bg-secondary rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Motoboy</p>
                <p className="text-xl font-bold font-mono">{selectedEntregador.nome}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="skipReason">Motivo para pular a vez</Label>
                <Textarea
                  id="skipReason"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="Ex: Não estava pronto, foi ao banheiro..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSkipDialogOpen(false);
                setSkipReason('');
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSkipTurn}
              disabled={!skipReason.trim()}
              className="flex-1"
            >
              Pular Vez
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
