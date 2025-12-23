import { useNavigate } from 'react-router-dom';
import { useUnit } from '@/contexts/UnitContext';
import { Unidade } from '@/lib/api';
import { Pizza, MapPin, ArrowRight, Users, Tv, Settings, History, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

const units: { value: Unidade; label: string; description: string; gradient: string }[] = [
  {
    value: 'ITAQUA',
    label: 'Itaquaquecetuba',
    description: 'Unidade matriz',
    gradient: 'from-purple-500/20 via-purple-600/10 to-transparent',
  },
  {
    value: 'POA',
    label: 'Poá',
    description: 'Unidade filial',
    gradient: 'from-cyan-500/20 via-cyan-600/10 to-transparent',
  },
  {
    value: 'SUZANO',
    label: 'Suzano',
    description: 'Unidade filial',
    gradient: 'from-rose-500/20 via-rose-600/10 to-transparent',
  },
];

const features = [
  { icon: Settings, label: 'Configuração', description: 'Cadastre e gerencie motoboys' },
  { icon: Users, label: 'Roteirista', description: 'Controle a fila de entregas' },
  { icon: Tv, label: 'Tela TV', description: 'Chamada visual e sonora' },
  { icon: History, label: 'Histórico', description: 'Contagem de entregas do dia' },
];

export default function Index() {
  const navigate = useNavigate();
  const { setSelectedUnit } = useUnit();

  const handleSelectUnit = (unit: Unidade) => {
    setSelectedUnit(unit);
    navigate('/roteirista');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative container py-20">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-2xl shadow-primary/30">
              <Pizza className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="font-mono text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
              Fila Dom Fiorentino
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl">
              Sistema profissional de gestão de entregas com controle de fila,
              rotação e chamada em tempo real.
            </p>
          </div>

          {/* Unit Selection */}
          <div className="max-w-4xl mx-auto mb-20">
            <h2 className="text-center text-lg font-medium text-muted-foreground mb-6">
              Selecione a unidade para começar
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {units.map((unit) => (
                <button
                  key={unit.value}
                  onClick={() => handleSelectUnit(unit.value)}
                  className="group relative bg-card border border-border rounded-xl p-6 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${unit.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{unit.label}</h3>
                    <p className="text-sm text-muted-foreground">{unit.description}</p>
                    <div className="mt-3 text-xs font-mono text-muted-foreground">
                      {unit.value}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Motoboy Link */}
          <div className="max-w-md mx-auto mb-12">
            <Link
              to="/meu-lugar"
              className="flex items-center justify-between bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Sou Motoboy</h3>
                  <p className="text-sm text-muted-foreground">
                    Consulte sua posição na fila
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          </div>

          {/* Features Grid */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-center text-lg font-medium text-muted-foreground mb-6">
              Funcionalidades do sistema
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.label}
                    className="bg-card/50 border border-border/50 rounded-lg p-4 text-center"
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary mx-auto mb-3 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">{feature.label}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Fila Dom Fiorentino • Sistema de Gestão de Entregas</p>
        </div>
      </footer>
    </div>
  );
}
