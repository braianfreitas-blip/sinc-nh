import { useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PRESENCE_LABELS, PRESENCE_COLORS, PAYMENT_LABELS, PAYMENT_COLORS } from '@/types/event';
import { Search, UserCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckinPage() {
  const { event, updateGuest } = useEvent();
  const [search, setSearch] = useState('');

  const guests = event.guests.filter(g => {
    if (!search) return true;
    return `${g.firstName} ${g.lastName}`.toLowerCase().includes(search.toLowerCase());
  });

  const checkedIn = event.guests.filter(g => g.checkedIn).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Check-in</h1>
        <p className="text-muted-foreground mt-1">{checkedIn} de {event.guests.length} check-ins realizados</p>
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden max-w-md mx-auto">
          <div className="h-full bg-success rounded-full transition-all" style={{ width: `${event.guests.length > 0 ? (checkedIn / event.guests.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar convidado pelo nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-12 h-14 text-lg rounded-xl"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        {guests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum convidado encontrado.</p>
        ) : guests.map(g => (
          <div
            key={g.id}
            className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
              g.checkedIn ? 'bg-success/5 border-success/20' : 'bg-card border-border'
            }`}
          >
            <div className="flex items-center gap-3">
              {g.checkedIn && <CheckCircle2 className="w-5 h-5 text-success" />}
              <div>
                <p className="font-medium">{g.firstName} {g.lastName}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRESENCE_COLORS[g.presenceStatus]}`}>
                    {PRESENCE_LABELS[g.presenceStatus]}
                  </span>
                  {event.isPaid && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_COLORS[g.paymentStatus]}`}>
                      {PAYMENT_LABELS[g.paymentStatus]}
                    </span>
                  )}
                </div>
                {g.companions > 0 && <p className="text-xs text-muted-foreground mt-1">+{g.companions} acompanhante(s)</p>}
                {g.checkedIn && g.checkedInAt && (
                  <p className="text-xs text-success mt-1">Check-in: {new Date(g.checkedInAt).toLocaleTimeString('pt-BR')}</p>
                )}
              </div>
            </div>
            {!g.checkedIn ? (
              <Button
                onClick={() => {
                  updateGuest(g.id, { checkedIn: true, checkedInAt: new Date().toISOString(), presenceStatus: 'attended' });
                  toast.success(`Check-in de ${g.firstName} realizado!`);
                }}
                size="sm"
              >
                <UserCheck className="w-4 h-4 mr-1" />Check-in
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  updateGuest(g.id, { checkedIn: false, checkedInAt: undefined, presenceStatus: 'confirmed' });
                  toast.info('Check-in desfeito.');
                }}
              >
                Desfazer
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
