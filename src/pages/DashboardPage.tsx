import { useEvent } from '@/contexts/EventContext';
import { PRESENCE_LABELS, PAYMENT_LABELS, PRESENCE_COLORS, PAYMENT_COLORS } from '@/types/event';
import { Users, UserCheck, Clock, XCircle, ListOrdered, CheckCircle2, DollarSign, TrendingUp, Percent } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-card animate-fade-in border border-border">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color || 'bg-primary/10 text-primary'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function DashboardPage() {
  const { event, stats } = useEvent();
  const recentConfirmations = [...event.guests]
    .filter(g => g.confirmedAt)
    .sort((a, b) => new Date(b.confirmedAt!).getTime() - new Date(a.confirmedAt!).getTime())
    .slice(0, 5);
  const recentPayments = [...event.payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{event.name || 'Configure seu evento nas configurações'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Total" value={stats.totalGuests} sub={`${stats.totalWithCompanions} com acomp.`} />
        <StatCard icon={UserCheck} label="Confirmados" value={stats.confirmed} color="bg-success/10 text-success" />
        <StatCard icon={Clock} label="Pendentes" value={stats.pending} color="bg-warning/10 text-warning" />
        <StatCard icon={XCircle} label="Cancelados" value={stats.cancelled} color="bg-destructive/10 text-destructive" />
        <StatCard icon={ListOrdered} label="Lista de Espera" value={stats.waitlist} color="bg-info/10 text-info" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Arrecadado" value={formatCurrency(stats.totalReceived)} color="bg-success/10 text-success" />
        <StatCard icon={TrendingUp} label="Pendente" value={formatCurrency(stats.totalPending)} color="bg-warning/10 text-warning" />
        <StatCard icon={Percent} label="Taxa Confirmação" value={`${stats.confirmationRate}%`} />
        <StatCard icon={CheckCircle2} label="Compareceram" value={stats.attended} color="bg-primary/10 text-primary" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold mb-4">Últimas Confirmações</h3>
          {recentConfirmations.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma confirmação ainda.</p>
          ) : (
            <div className="space-y-3">
              {recentConfirmations.map(g => (
                <div key={g.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{g.firstName} {g.lastName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(g.confirmedAt!).toLocaleString('pt-BR')}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${PRESENCE_COLORS[g.presenceStatus]}`}>
                    {PRESENCE_LABELS[g.presenceStatus]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold mb-4">Últimos Pagamentos</h3>
          {recentPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum pagamento registrado.</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map(p => {
                const guest = event.guests.find(g => g.id === p.guestId);
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{guest ? `${guest.firstName} ${guest.lastName}` : 'Desconhecido'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.date).toLocaleString('pt-BR')}</p>
                    </div>
                    <span className="text-sm font-semibold text-success">{formatCurrency(p.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
