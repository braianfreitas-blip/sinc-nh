import { useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PRESENCE_LABELS, PRESENCE_COLORS, PAYMENT_LABELS, PAYMENT_COLORS } from '@/types/event';
import { MapPin, Clock, CheckCircle2, AlertCircle, Users, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import sincLogo from '@/assets/sinc-logo.png';

export default function PublicRSVPPage() {
  const { event, findGuestByName, addGuest, updateGuest } = useEvent();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companions, setCompanions] = useState(0);
  const [found, setFound] = useState<ReturnType<typeof findGuestByName> | null>(null);
  const [searched, setSearched] = useState(false);

  const confirmedCount = event.guests.filter(g => g.presenceStatus !== 'cancelled').reduce((s, g) => s + 1 + g.companions, 0);
  const isFull = confirmedCount >= event.maxGuests;

  const handleSearch = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Informe nome e sobrenome.');
      return;
    }
    const guest = findGuestByName(firstName.trim(), lastName.trim());
    setFound(guest || null);
    setSearched(true);
  };

  const handleConfirm = () => {
    if (found) {
      const status = isFull ? 'waitlist' : 'confirmed';
      updateGuest(found.id, {
        presenceStatus: status,
        confirmedAt: new Date().toISOString(),
        companions: event.allowCompanions ? companions : 0,
        amountDue: event.isPaid ? event.ticketPrice * (1 + (event.allowCompanions ? companions : 0)) : 0,
      });
      setFound({ ...found, presenceStatus: status, confirmedAt: new Date().toISOString() });
      toast.success(status === 'waitlist' ? 'Adicionado à lista de espera!' : 'Presença confirmada!');
    } else {
      const status = isFull ? 'waitlist' : 'confirmed';
      const guest = addGuest({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        presenceStatus: status,
        paymentStatus: event.isPaid ? 'pending' : 'not_applicable',
        amountDue: event.isPaid ? event.ticketPrice * (1 + (event.allowCompanions ? companions : 0)) : 0,
        amountPaid: 0,
        companions: event.allowCompanions ? companions : 0,
        notes: '',
        checkedIn: false,
        confirmedAt: new Date().toISOString(),
      });
      setFound(guest);
      toast.success(status === 'waitlist' ? 'Adicionado à lista de espera!' : 'Presença confirmada!');
    }
    setSearched(true);
  };

  const isConfirmed = found && (found.presenceStatus === 'confirmed' || found.presenceStatus === 'attended');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="gradient-primary text-primary-foreground py-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          <img src={sincLogo} alt="SINC" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6" />
          <h1 className="font-display text-4xl font-bold mb-4">{event.name || 'Evento'}</h1>
          {event.description && <p className="text-primary-foreground/80 mb-6">{event.description}</p>}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-primary-foreground/70">
            {event.date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                {new Date(event.date + 'T00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
            {event.time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{event.time}</span>}
            {event.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{event.location}</span>}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-md mx-auto -mt-8 px-4 pb-16">
        <div className="bg-card rounded-2xl border border-border shadow-elegant p-8">
          {!isConfirmed ? (
            <>
              <h2 className="font-display text-xl font-semibold text-center mb-6">Confirme sua Presença</h2>
              {isFull && (
                <div className="bg-warning/10 text-warning rounded-lg p-3 mb-4 flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Evento lotado. Novas confirmações entram na lista de espera.
                </div>
              )}
              <div className="space-y-4">
                <div><Label>Nome *</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="João" /></div>
                <div><Label>Sobrenome *</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Silva" /></div>
                {event.allowCompanions && (
                  <div>
                    <Label>Acompanhantes (máx: {event.maxCompanions})</Label>
                    <Input type="number" min={0} max={event.maxCompanions} value={companions} onChange={e => setCompanions(Math.min(Number(e.target.value), event.maxCompanions))} />
                  </div>
                )}
                {event.isPaid && (
                  <div className="bg-gold-light rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">Valor do ingresso</p>
                    <p className="text-2xl font-bold text-foreground">
                      {(event.ticketPrice * (1 + companions)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    {companions > 0 && <p className="text-xs text-muted-foreground">({1 + companions} pessoas)</p>}
                  </div>
                )}
                <Button onClick={handleConfirm} className="w-full h-12 text-base">
                  {isFull ? 'Entrar na Lista de Espera' : 'Confirmar Presença'}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h2 className="font-display text-xl font-semibold">Presença Confirmada!</h2>
              <p className="text-muted-foreground">{found!.firstName} {found!.lastName}</p>
              {found!.companions > 0 && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Users className="w-4 h-4" />+{found!.companions} acompanhante(s)
                </p>
              )}
              {event.isPaid && found!.paymentStatus === 'pending' && (
                <div className="bg-warning/10 rounded-lg p-4 mt-4">
                  <p className="text-sm font-medium text-warning">Pagamento pendente</p>
                  <p className="text-2xl font-bold mt-1">{(found!.amountDue - found!.amountPaid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  <Button className="mt-3 w-full" onClick={() => toast.info('Integração com Stripe será habilitada em breve.')}>
                    Pagar Agora
                  </Button>
                </div>
              )}
              {event.isPaid && found!.paymentStatus === 'paid' && (
                <div className="bg-success/10 rounded-lg p-4 mt-4">
                  <p className="text-sm font-medium text-success">✓ Pagamento aprovado</p>
                </div>
              )}
            </div>
          )}

          {searched && !found && !isConfirmed && (
            <p className="text-xs text-muted-foreground text-center mt-3">Novo convidado — sua confirmação será registrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
