import { Entregador } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Phone, User, Megaphone, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

interface QueueCardProps {
  entregador: Entregador;
  position: number;
  onCall?: () => void;
  onReturn?: () => void;
  isLoading?: boolean;
}

export function QueueCard({
  entregador,
  position,
  onCall,
  onReturn,
  isLoading,
}: QueueCardProps) {
  const showCallButton = entregador.status === 'disponivel';
  const showReturnButton = entregador.status === 'entregando';

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg p-4 transition-all',
        entregador.status === 'chamado' && 'border-accent glow-pulse',
        entregador.status === 'entregando' && 'border-status-delivering'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold font-mono',
              'bg-secondary text-muted-foreground'
            )}
          >
            #{position}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{entregador.nome}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{entregador.telefone}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showCallButton && (
            <Button
              onClick={onCall}
              disabled={isLoading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            >
              <Megaphone className="w-4 h-4" />
              Chamar
            </Button>
          )}

          {showReturnButton && (
            <Button
              onClick={onReturn}
              disabled={isLoading}
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <RotateCcw className="w-4 h-4" />
              Retornou
            </Button>
          )}

          {entregador.status === 'chamado' && (
            <span className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium animate-pulse">
              Aguardando...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
