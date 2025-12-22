import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { fetchEntregadores, updateEntregador, Entregador } from '@/lib/api';
import { Pizza, User, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CALL_AUDIO_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const AUTO_DELIVER_DELAY = 15000; // 15 seconds

export default function TV() {
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [calledTimers, setCalledTimers] = useState<Record<string, NodeJS.Timeout>>({});

  // Redirect if no unit selected
  if (!selectedUnit) {
    return <Navigate to="/" replace />;
  }

  // Query for fetching entregadores
  const { data: entregadores = [] } = useQuery({
    queryKey: ['entregadores', selectedUnit, 'tv'],
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
  });

  // Filter entregadores
  const availableQueue = entregadores.filter((e) => e.status === 'disponivel');
  const calledEntregadores = entregadores.filter((e) => e.status === 'chamado');
  const deliveringQueue = entregadores.filter((e) => e.status === 'entregando');

  // Play audio when someone is called
  useEffect(() => {
    if (calledEntregadores.length > 0 && !isMuted) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    }
  }, [calledEntregadores.length, isMuted]);

  // Auto-transition from chamado to entregando after 15 seconds
  useEffect(() => {
    calledEntregadores.forEach((entregador) => {
      if (!calledTimers[entregador.id]) {
        const timer = setTimeout(() => {
          updateMutation.mutate({
            id: entregador.id,
            data: { status: 'entregando' },
          });
          setCalledTimers((prev) => {
            const newTimers = { ...prev };
            delete newTimers[entregador.id];
            return newTimers;
          });
        }, AUTO_DELIVER_DELAY);

        setCalledTimers((prev) => ({ ...prev, [entregador.id]: timer }));
      }
    });

    // Cleanup timers for entregadores no longer called
    Object.keys(calledTimers).forEach((id) => {
      if (!calledEntregadores.find((e) => e.id === id)) {
        clearTimeout(calledTimers[id]);
        setCalledTimers((prev) => {
          const newTimers = { ...prev };
          delete newTimers[id];
          return newTimers;
        });
      }
    });

    return () => {
      Object.values(calledTimers).forEach(clearTimeout);
    };
  }, [calledEntregadores]);

  const handleReturn = async (entregador: Entregador) => {
    try {
      await updateMutation.mutateAsync({
        id: entregador.id,
        data: { 
          status: 'disponivel',
          fila_posicao: new Date().toISOString(),
        },
      });
      toast.success(`${entregador.nome} voltou para a fila!`);
    } catch (error) {
      toast.error('Erro ao registrar retorno');
    }
  };

  // Se tem alguém chamado, mostra tela fullscreen
  if (calledEntregadores.length > 0) {
    const chamado = calledEntregadores[0];
    return (
      <div className="min-h-screen bg-accent flex flex-col items-center justify-center p-8">
        <audio ref={audioRef} src={CALL_AUDIO_URL} preload="auto" />
        
        <div className="text-center animate-fade-in">
          <p className="text-2xl md:text-4xl text-accent-foreground/80 mb-4 font-mono">
            AGORA É SUA VEZ
          </p>
          
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-background mx-auto mb-8 flex items-center justify-center glow-pulse">
            <User className="w-16 h-16 md:w-24 md:h-24 text-accent" />
          </div>
          
          <h1 className="text-5xl md:text-8xl lg:text-9xl font-bold font-mono text-accent-foreground text-glow mb-8">
            {chamado.nome.toUpperCase()}
          </h1>
          
          <p className="text-xl md:text-3xl text-accent-foreground/80">
            Dirija-se ao balcão
          </p>
        </div>

        {/* Mute button */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-6 right-6 p-3 rounded-lg bg-background/20 hover:bg-background/30 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-accent-foreground" />
          ) : (
            <Volume2 className="w-6 h-6 text-accent-foreground" />
          )}
        </button>

        {/* Back to home */}
        <Link 
          to="/" 
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-background/20 hover:bg-background/30 transition-colors text-accent-foreground"
        >
          <Pizza className="w-5 h-5" />
          <span className="font-mono font-bold">DeliveryOS</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={CALL_AUDIO_URL} preload="auto" />

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-card/50">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Pizza className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <span className="font-mono font-bold text-xl">DeliveryOS</span>
            <span className="ml-3 px-3 py-1 rounded-full bg-secondary text-sm font-medium">
              {selectedUnit}
            </span>
          </div>
        </Link>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-muted-foreground" />
          ) : (
            <Volume2 className="w-6 h-6 text-foreground" />
          )}
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid lg:grid-cols-2 gap-0">
        {/* Left Column - Queue */}
        <div className="border-r border-border p-8 overflow-hidden">
          <h2 className="text-2xl font-bold font-mono mb-6 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-status-available" />
            Fila de Espera ({availableQueue.length})
          </h2>

          {availableQueue.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-xl text-muted-foreground">Nenhum entregador na fila</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableQueue.map((entregador, index) => (
                <div
                  key={entregador.id}
                  className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold font-mono">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-semibold">{entregador.nome}</p>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-status-available" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Em Entrega com botão Retornar */}
        <div className="p-8 overflow-hidden">
          <h2 className="text-2xl font-bold font-mono mb-6 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-status-delivering" />
            Em Entrega ({deliveringQueue.length})
          </h2>

          {deliveringQueue.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
                <p className="text-xl text-muted-foreground">Nenhum entregador em entrega</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveringQueue.map((entregador, index) => (
                <div
                  key={entregador.id}
                  className="flex items-center gap-4 bg-card border border-border rounded-xl p-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-14 h-14 rounded-full bg-status-delivering/20 flex items-center justify-center">
                    <User className="w-7 h-7 text-status-delivering" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-semibold">{entregador.nome}</p>
                  </div>
                  <Button
                    onClick={() => handleReturn(entregador)}
                    disabled={updateMutation.isPending}
                    variant="outline"
                    size="lg"
                    className="gap-2 text-lg px-6"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Retornar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-8 py-3 border-t border-border bg-card/50 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Atualização automática a cada 5 segundos
        </span>
        <span className="text-sm text-muted-foreground font-mono">
          {new Date().toLocaleTimeString('pt-BR')}
        </span>
      </footer>
    </div>
  );
}
