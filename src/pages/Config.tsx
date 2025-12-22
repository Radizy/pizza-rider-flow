import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { Layout, BackButton } from '@/components/Layout';
import { EntregadorCard } from '@/components/EntregadorCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchEntregadores,
  createEntregador,
  updateEntregador,
  deleteEntregador,
  Entregador,
  Unidade,
} from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Users, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Config() {
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntregador, setEditingEntregador] = useState<Entregador | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    unidade: selectedUnit || ('ITAQUA' as Unidade),
  });

  // Redirect if no unit selected
  if (!selectedUnit) {
    return <Navigate to="/" replace />;
  }

  // Query for fetching entregadores
  const { data: entregadores = [], isLoading } = useQuery({
    queryKey: ['entregadores', selectedUnit],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit }),
  });

  // Mutation for creating entregador
  const createMutation = useMutation({
    mutationFn: createEntregador,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Entregador cadastrado com sucesso!');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao cadastrar entregador');
    },
  });

  // Mutation for updating entregador
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Entregador> }) =>
      updateEntregador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Entregador atualizado!');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao atualizar entregador');
    },
  });

  // Mutation for deleting entregador
  const deleteMutation = useMutation({
    mutationFn: deleteEntregador,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Entregador removido!');
    },
    onError: () => {
      toast.error('Erro ao remover entregador');
    },
  });

  const resetForm = () => {
    setFormData({ nome: '', telefone: '', unidade: selectedUnit });
    setEditingEntregador(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.telefone.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (editingEntregador) {
      updateMutation.mutate({
        id: editingEntregador.id,
        data: {
          nome: formData.nome,
          telefone: formData.telefone,
        },
      });
    } else {
      createMutation.mutate({
        nome: formData.nome,
        telefone: formData.telefone,
        unidade: formData.unidade,
        status: 'disponivel',
        ativo: true,
      });
    }
  };

  const handleEdit = (entregador: Entregador) => {
    setEditingEntregador(entregador);
    setFormData({
      nome: entregador.nome,
      telefone: entregador.telefone,
      unidade: entregador.unidade,
    });
    setIsFormOpen(true);
  };

  const handleToggleAtivo = (entregador: Entregador) => {
    const updateData: Partial<Entregador> = { ativo: !entregador.ativo };
    
    // Se está ativando, atualiza a posição na fila para o momento atual
    if (!entregador.ativo) {
      updateData.fila_posicao = new Date().toISOString();
    }
    
    updateMutation.mutate({
      id: entregador.id,
      data: updateData,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este entregador?')) {
      deleteMutation.mutate(id);
    }
  };

  const activeCount = entregadores.filter((e) => e.ativo).length;

  return (
    <Layout>
      <BackButton />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-mono mb-2">Configuração</h1>
          <p className="text-muted-foreground">
            Gerencie os entregadores da unidade{' '}
            <span className="font-semibold text-foreground">{selectedUnit}</span>
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Entregador
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total cadastrados</p>
              <p className="text-2xl font-bold font-mono">{entregadores.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-available/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-status-available" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold font-mono">{activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : entregadores.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-lg">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Nenhum entregador cadastrado nesta unidade
          </p>
          <Button onClick={() => setIsFormOpen(true)} variant="outline">
            Cadastrar primeiro entregador
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {entregadores.map((entregador) => (
            <EntregadorCard
              key={entregador.id}
              entregador={entregador}
              onEdit={() => handleEdit(entregador)}
              onDelete={() => handleDelete(entregador.id)}
              onToggleAtivo={() => handleToggleAtivo(entregador)}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingEntregador ? 'Editar Entregador' : 'Novo Entregador'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nome: e.target.value }))
                }
                placeholder="Nome do entregador"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone (com DDD)</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, telefone: e.target.value }))
                }
                placeholder="11999999999"
              />
            </div>

            {!editingEntregador && (
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Select
                  value={formData.unidade}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, unidade: value as Unidade }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ITAQUA">Itaquaquecetuba</SelectItem>
                    <SelectItem value="POA">Poá</SelectItem>
                    <SelectItem value="SUZANO">Suzano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingEntregador ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
