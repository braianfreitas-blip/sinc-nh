import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Upload, Settings, CreditCard, UserCheck, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { useAuth } from '@/contexts/AuthContext';
import sincLogo from '@/assets/sinc-logo.png';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/guests', icon: Users, label: 'Convidados' },
  { to: '/admin/import', icon: Upload, label: 'Importar' },
  { to: '/admin/financial', icon: CreditCard, label: 'Financeiro' },
  { to: '/admin/checkin', icon: UserCheck, label: 'Check-in' },
  { to: '/admin/settings', icon: Settings, label: 'Configurações' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { event } = useEvent();
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 gradient-primary text-sidebar-foreground">
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/admin" className="flex items-center gap-3">
            <img src={sincLogo} alt="SINC" className="w-10 h-10 rounded-lg object-cover" />
            <div>
              <h1 className="font-display text-lg font-semibold text-sidebar-primary">SINC</h1>
              <p className="text-xs text-sidebar-foreground/60 truncate max-w-[140px]">{event.name || 'Sem evento'}</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            <Users className="w-4 h-4" />
            Página pública
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
          {user && (
            <p className="px-4 text-xs text-sidebar-foreground/40 truncate">{user.email}</p>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 gradient-primary text-sidebar-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={sincLogo} alt="SINC" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-display font-semibold text-sidebar-primary">SINC</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-foreground/50" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full gradient-primary p-4 pt-20 space-y-1" onClick={e => e.stopPropagation()}>
            {navItems.map(item => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:overflow-auto">
        <div className="pt-16 lg:pt-0 p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
