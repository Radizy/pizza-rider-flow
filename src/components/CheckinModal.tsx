import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, User, CheckCircle } from 'lucide-react';
import { Entregador } from '@/lib/api';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CheckinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregadores: Entregador[];
  onCheckin: (entregador: Entregador) => Promise<void>;
  isLoading: boolean;
}

export function CheckinModal({
  open,
  onOpenChange,
  entregadores,
  onCheckin,
  isLoading,
}: CheckinModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const filteredEntregadores = entregadores.filter((e) =>
    e.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCheckin = async (entregador: Entregador) => {
    setCheckingIn(entregador.id);
    try {
      await onCheckin(entregador);
    } finally {
      setCheckingIn(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="font-mono text-2xl flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-primary" />
            Check-in na Fila
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar motoboy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntregadores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum motoboy encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntregadores.map((entregador) => {
                const isInQueue = entregador.status === 'disponivel';
                const isDelivering = entregador.status === 'entregando';
                const isCalled = entregador.status === 'chamado';

                return (
                  <Button
                    key={entregador.id}
                    onClick={() => handleCheckin(entregador)}
                    disabled={checkingIn === entregador.id || isInQueue || isDelivering || isCalled}
                    variant={isInQueue ? 'secondary' : 'outline'}
                    className="w-full justify-start gap-3 h-14 text-lg"
                  >
                    {checkingIn === entregador.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                    <span className="flex-1 text-left font-semibold">
                      {entregador.nome}
                    </span>
                    {isInQueue && (
                      <span className="text-sm text-status-available font-medium">
                        ✓ Na Fila
                      </span>
                    )}
                    {isDelivering && (
                      <span className="text-sm text-status-delivering font-medium">
                        Em Entrega
                      </span>
                    )}
                    {isCalled && (
                      <span className="text-sm text-status-called font-medium">
                        Chamado
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
