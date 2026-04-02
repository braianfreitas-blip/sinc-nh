import { useEvent } from '@/contexts/EventContext';
import { PAYMENT_METHOD_LABELS, PAYMENT_LABELS, PAYMENT_COLORS } from '@/types/event';
import { DollarSign, TrendingUp, TrendingDown, ShieldCheck, RotateCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FinancialPage() {
  const { event, stats } = useEvent();

  const byMethod: Record<string, number> = {};
  event.payments.forEach(p => {
    byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
  });

  const handleExport = () => {
    const headers = ['Convidado', 'Valor', 'Método', 'Data', 'Observação', 'Manual'];
    const rows = event.payments.map(p => {
      const g = event.guests.find(g => g.id === p.guestId);
      return [g ? `${g.firstName} ${g.lastName}` : '?', p.amount, PAYMENT_METHOD_LABELS[p.method], p.date, p.notes, p.isManual ? 'Sim' : 'Não'];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'financeiro.csv';
    a.click();
    toast.success('Relatório exportado!');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Controle financeiro do evento</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" />Exportar</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { icon: DollarSign, label: 'Total Esperado', value: fmt(stats.totalExpected), color: 'bg-primary/10 text-primary' },
          { icon: TrendingUp, label: 'Total Recebido', value: fmt(stats.totalReceived), color: 'bg-success/10 text-success' },
          { icon: TrendingDown, label: 'Total Pendente', value: fmt(stats.totalPending), color: 'bg-warning/10 text-warning' },
          { icon: ShieldCheck, label: 'Isentos', value: String(stats.totalExempt), color: 'bg-info/10 text-info' },
          { icon: RotateCcw, label: 'Estornado', value: fmt(stats.totalRefunded), color: 'bg-destructive/10 text-destructive' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-5 shadow-card border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {Object.keys(byMethod).length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold mb-4">Receita por Método</h3>
          <div className="space-y-3">
            {Object.entries(byMethod).map(([method, total]) => (
              <div key={method} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm font-medium">{PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS]}</span>
                <span className="text-sm font-semibold text-success">{fmt(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h3 className="font-display text-lg font-semibold mb-4">Histórico de Pagamentos</h3>
        {event.payments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum pagamento registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground">Convidado</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Valor</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Método</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Data</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {[...event.payments].reverse().map(p => {
                  const g = event.guests.find(g => g.id === p.guestId);
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-medium">{g ? `${g.firstName} ${g.lastName}` : '—'}</td>
                      <td className="p-3 text-success font-semibold">{fmt(p.amount)}</td>
                      <td className="p-3">{PAYMENT_METHOD_LABELS[p.method]}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{new Date(p.date).toLocaleString('pt-BR')}</td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">{p.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
