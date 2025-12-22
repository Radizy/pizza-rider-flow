import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { fetchEntregadores, updateEntregador, Entregador } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Pizza, User, Volume2, VolumeX } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';

const CALL_AUDIO_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const AUTO_DELIVER_DELAY = 15000; // 15 seconds

export default function TV() {
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [calledTimers, setCalledTimers] = useState<Record<number, NodeJS.Timeout>>({});

  // Redirect if no unit selected
  if (!selectedUnit) {
    return <Navigate to="/" replace />;
  }

  // Query for fetching entregadores
  const { data: entregadores = [] } = useQuery({
    queryKey: ['entregadores', selectedUnit, 'tv'],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit, ativo: true }),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Mutation for updating status
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Entregador> }) =>
      updateEntregador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
    },
  });

  // Filter entregadores
  const availableQueue = entregadores.filter((e) => e.status === 'disponivel');
  const calledEntregadores = entregadores.filter((e) => e.status === 'chamado');

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
    Object.keys(calledTimers).forEach((idStr) => {
      const id = parseInt(idStr);
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
            Fila de Espera
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

        {/* Right Column - Called */}
        <div className="p-8 flex items-center justify-center">
          {calledEntregadores.length === 0 ? (
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-secondary mx-auto mb-6 flex items-center justify-center">
                <User className="w-16 h-16 text-muted-foreground" />
              </div>
              <p className="text-2xl text-muted-foreground">Aguardando chamada...</p>
            </div>
          ) : (
            <div className="text-center space-y-8">
              {calledEntregadores.map((entregador) => (
                <div
                  key={entregador.id}
                  className={cn(
                    'p-12 rounded-3xl border-4 border-accent bg-accent/10',
                    'glow-pulse'
                  )}
                >
                  <div className="w-32 h-32 rounded-full bg-accent mx-auto mb-8 flex items-center justify-center">
                    <User className="w-16 h-16 text-accent-foreground" />
                  </div>
                  <h2 className="text-6xl font-bold font-mono text-accent text-glow mb-4">
                    {entregador.nome.toUpperCase()}
                  </h2>
                  <p className="text-2xl text-muted-foreground">
                    Dirija-se ao balcão
                  </p>
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
