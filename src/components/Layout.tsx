import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUnit } from '@/contexts/UnitContext';
import { UnitSelector } from './UnitSelector';
import { Settings, Users, Tv, UserCheck, Pizza, ArrowLeft } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

const navItems = [
  { path: '/config', label: 'Configuração', icon: Settings },
  { path: '/roteirista', label: 'Roteirista', icon: Users },
  { path: '/tv', label: 'TV', icon: Tv },
  { path: '/checkin', label: 'Check-in', icon: UserCheck },
];

export function Layout({ children, showHeader = true }: LayoutProps) {
  const location = useLocation();
  const { selectedUnit, setSelectedUnit } = useUnit();

  if (!showHeader) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Pizza className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-mono font-bold text-lg">DeliveryOS</span>
            </Link>

            {selectedUnit && (
              <>
                <span className="text-border">|</span>
                <UnitSelector
                  value={selectedUnit}
                  onChange={setSelectedUnit}
                />
              </>
            )}
          </div>

          {selectedUnit && (
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                      'hover:bg-secondary',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      <main className="container py-8 animate-fade-in">{children}</main>
    </div>
  );
}

export function BackButton() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Voltar ao início</span>
    </Link>
  );
}
