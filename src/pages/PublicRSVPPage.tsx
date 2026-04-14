import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvent } from '@/contexts/EventContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, CheckCircle2, AlertCircle, Users, CalendarDays, XCircle, Search, CreditCard, Navigation2 } from 'lucide-react';
import { PAYMENT_LABELS } from '@/types/event';
import { toast } from 'sonner';
import sincLogo from '@/assets/sinc-logo.png';

export default function PublicRSVPPage() {
  const { event, findGuestByName, addGuest, updateGuest } = useEvent();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companions, setCompanions] = useState(0);
  const [invitedBy, setInvitedBy] = useState('');
  const [found, setFound] = useState<ReturnType<typeof findGuestByName> | null>(null);
  const [searched, setSearched] = useState(false);
  const [mode, setMode] = useState<'confirm' | 'manage'>('confirm');
  const [lookupFirst, setLookupFirst] = useState('');
  const [lookupLast, setLookupLast] = useState('');
  const [lookupResult, setLookupResult] = useState<ReturnType<typeof findGuestByName> | null>(null);
  const [lookupSearched, setLookupSearched] = useState(false);

  const confirmedGuests = event.guests.filter(g => g.presenceStatus === 'confirmed' || g.presenceStatus === 'attended');
  const cancelledGuests = event.guests.filter(g => g.presenceStatus === 'cancelled');
  const confirmedCount = event.guests.filter(g => g.presenceStatus !== 'cancelled').reduce((s, g) => s + 1 + g.companions, 0);
  const isFull = confirmedCount >= event.maxGuests;

  const canCancel = !event.cancellationDeadline || new Date() <= new Date(event.cancellationDeadline + 'T23:59:59');

  const handleConfirm = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Informe nome e sobrenome.');
      return;
    }
    const existing = findGuestByName(firstName.trim(), lastName.trim());
    if (existing) {
      const status = isFull ? 'waitlist' : 'confirmed';
      updateGuest(existing.id, {
        presenceStatus: status,
        confirmedAt: new Date().toISOString(),
        companions: event.allowCompanions ? companions : 0,
        amountDue: event.isPaid ? event.ticketPrice * (1 + (event.allowCompanions ? companions : 0)) : 0,
        invitedBy: invitedBy.trim(),
      });
      setFound({ ...existing, presenceStatus: status, confirmedAt: new Date().toISOString() });
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
        invitedBy: invitedBy.trim(),
        checkedIn: false,
        confirmedAt: new Date().toISOString(),
      });
      setFound(guest);
      toast.success(status === 'waitlist' ? 'Adicionado à lista de espera!' : 'Presença confirmada!');
    }
    setSearched(true);
  };

  const handleUnconfirm = () => {
    if (!found) return;
    if (!canCancel) {
      toast.error(`Prazo para cancelamento encerrado (${new Date(event.cancellationDeadline + 'T00:00').toLocaleDateString('pt-BR')}).`);
      return;
    }
    updateGuest(found.id, { presenceStatus: 'cancelled' });
    setFound({ ...found, presenceStatus: 'cancelled' });
    toast.success('Presença cancelada.');
  };

  const isConfirmed = found && (found.presenceStatus === 'confirmed' || found.presenceStatus === 'attended');
  const wasCancelled = found && found.presenceStatus === 'cancelled';

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setCompanions(0);
    setInvitedBy('');
    setFound(null);
    setSearched(false);
  };

  const handleLookup = () => {
    if (!lookupFirst.trim() || !lookupLast.trim()) {
      toast.error('Informe nome e sobrenome.');
      return;
    }
    const guest = findGuestByName(lookupFirst.trim(), lookupLast.trim());
    setLookupResult(guest || null);
    setLookupSearched(true);
  };

  const handleLookupCancel = () => {
    if (!lookupResult) return;
    if (!canCancel) {
      toast.error(`Prazo para cancelamento encerrado (${new Date(event.cancellationDeadline + 'T00:00').toLocaleDateString('pt-BR')}).`);
      return;
    }
    updateGuest(lookupResult.id, { presenceStatus: 'cancelled' });
    setLookupResult({ ...lookupResult, presenceStatus: 'cancelled' });
    toast.success('Presença cancelada.');
  };

  const resetLookup = () => {
    setLookupFirst('');
    setLookupLast('');
    setLookupResult(null);
    setLookupSearched(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="gradient-primary text-primary-foreground py-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          <img src={sincLogo} alt="SINC" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6" />
          <h1 className="font-display text-4xl font-bold mb-4" style={event.headerTextColor ? { color: event.headerTextColor } : undefined}>{event.name || 'Evento'}</h1>
          {event.description && <p className="text-primary-foreground/80 mb-6" style={event.headerTextColor ? { color: event.headerTextColor, opacity: 0.8 } : undefined}>{event.description}</p>}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-primary-foreground/70" style={event.headerTextColor ? { color: event.headerTextColor, opacity: 0.7 } : undefined}>
            {event.date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                {new Date(event.date + 'T00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
            {event.time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{event.time}</span>}
            {event.location && (
              <span className="flex items-center gap-1 flex-wrap">
                <MapPin className="w-4 h-4" />{event.location}
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors" title="Google Maps">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                </a>
                <a href={`https://waze.com/ul?q=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors" title="Waze">
                  <Navigation2 className="w-3.5 h-3.5 text-primary" />
                </a>
              </span>
            )}
          </div>
          {event.cancellationDeadline && (
            <p className="mt-4 text-sm bg-primary-foreground/10 rounded-lg px-4 py-2 inline-block" style={event.headerTextColor ? { color: event.headerTextColor } : undefined}>
              📅 Confirmação até {new Date(event.cancellationDeadline + 'T00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Form + Lista */}
      <div className="max-w-md mx-auto -mt-8 px-4 pb-16 space-y-6">
        {/* Toggle confirm / manage */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'confirm' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => { setMode('confirm'); resetLookup(); }}
          >
            Confirmar Presença
          </Button>
          <Button
            variant={mode === 'manage' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => { setMode('manage'); resetForm(); }}
          >
            <Search className="w-4 h-4 mr-2" />Gerenciar
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-elegant p-8">
          {mode === 'confirm' ? (
            <>
              {wasCancelled ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <XCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <h2 className="font-display text-xl font-semibold">Presença Cancelada</h2>
                  <p className="text-muted-foreground">{found!.firstName} {found!.lastName}</p>
                  <Button variant="outline" className="w-full" onClick={resetForm}>Voltar</Button>
                </div>
              ) : !isConfirmed ? (
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
                    <div><Label>Quem te convidou?</Label><Input value={invitedBy} onChange={e => setInvitedBy(e.target.value)} placeholder="Nome de quem convidou" /></div>
                    {event.allowCompanions && (
                      <div>
                        <Label>Acompanhantes (máx: {event.maxCompanions})</Label>
                        <Input type="number" min={0} max={event.maxCompanions} value={companions} onChange={e => setCompanions(Math.min(Number(e.target.value), event.maxCompanions))} />
                      </div>
                    )}
                    {event.isPaid && (
                      <div className="bg-gold-light rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground">{event.ticketLabel || 'Ingresso'}</p>
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
                  {event.isPaid && (found!.paymentStatus === 'pending' || found!.paymentStatus === 'partial') && (
                    <div className="bg-warning/10 rounded-lg p-4 mt-4">
                      <p className="text-sm font-medium text-warning">Pagamento pendente</p>
                      <p className="text-2xl font-bold mt-1">{(found!.amountDue - found!.amountPaid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      {event.pixKey && (
                        <Button className="mt-3 w-full" onClick={() => {
                          navigator.clipboard.writeText(event.pixKey!);
                          toast.success('Chave PIX copiada! Cole no app do seu banco para pagar.');
                        }}>
                          <CreditCard className="w-4 h-4 mr-2" />Pagar Agora (PIX)
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">A confirmação do pagamento será feita pelo administrador.</p>
                    </div>
                  )}
                  {event.isPaid && found!.paymentStatus === 'paid' && (
                    <div className="bg-success/10 rounded-lg p-4 mt-4">
                      <p className="text-sm font-medium text-success">✓ Pagamento aprovado</p>
                    </div>
                  )}
                  {canCancel && (
                    <Button variant="destructive" className="w-full" onClick={handleUnconfirm}>
                      <XCircle className="w-4 h-4 mr-2" />Cancelar Presença
                    </Button>
                  )}
                  {!canCancel && event.cancellationDeadline && (
                    <p className="text-xs text-muted-foreground">
                      Prazo para cancelamento encerrado em {new Date(event.cancellationDeadline + 'T00:00').toLocaleDateString('pt-BR')}.
                    </p>
                  )}
                  <Button variant="outline" className="w-full" onClick={resetForm}>
                    Adicionar outro convidado
                  </Button>
                </div>
              )}
              {searched && !found && !isConfirmed && (
                <p className="text-xs text-muted-foreground text-center mt-3">Novo convidado — sua confirmação será registrada.</p>
              )}
            </>
          ) : (
            /* Manage / Lookup mode */
            <>
              {!lookupSearched || !lookupResult ? (
                <>
                  <h2 className="font-display text-xl font-semibold text-center mb-6">Buscar minha Confirmação</h2>
                  <div className="space-y-4">
                    <div><Label>Nome *</Label><Input value={lookupFirst} onChange={e => setLookupFirst(e.target.value)} placeholder="João" /></div>
                    <div><Label>Sobrenome *</Label><Input value={lookupLast} onChange={e => setLookupLast(e.target.value)} placeholder="Silva" /></div>
                    <Button onClick={handleLookup} className="w-full h-12 text-base">
                      <Search className="w-4 h-4 mr-2" />Buscar
                    </Button>
                  </div>
                  {lookupSearched && !lookupResult && (
                    <p className="text-sm text-muted-foreground text-center mt-4">Nenhuma confirmação encontrada com esse nome.</p>
                  )}
                </>
              ) : lookupResult.presenceStatus === 'cancelled' ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <XCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <h2 className="font-display text-xl font-semibold">Presença Cancelada</h2>
                  <p className="text-muted-foreground">{lookupResult.firstName} {lookupResult.lastName}</p>
                  <Button variant="outline" className="w-full" onClick={resetLookup}>Voltar</Button>
                </div>
              ) : (lookupResult.presenceStatus === 'confirmed' || lookupResult.presenceStatus === 'attended') ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <h2 className="font-display text-xl font-semibold">Presença Confirmada</h2>
                  <p className="text-muted-foreground">{lookupResult.firstName} {lookupResult.lastName}</p>
                  {lookupResult.companions > 0 && (
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Users className="w-4 h-4" />+{lookupResult.companions} acompanhante(s)
                    </p>
                  )}
                  {event.isPaid && (
                    <div className={`rounded-lg p-4 mt-2 ${lookupResult.paymentStatus === 'paid' ? 'bg-success/10' : 'bg-warning/10'}`}>
                      <p className="text-sm font-medium flex items-center justify-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        Pagamento: {PAYMENT_LABELS[lookupResult.paymentStatus]}
                      </p>
                      {(lookupResult.paymentStatus === 'pending' || lookupResult.paymentStatus === 'partial') && (
                        <>
                          <p className="text-2xl font-bold mt-1">
                            {(lookupResult.amountDue - lookupResult.amountPaid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">A confirmação do pagamento será feita pelo administrador.</p>
                        </>
                      )}
                      {lookupResult.paymentStatus === 'paid' && (
                        <p className="text-sm text-success mt-1">✓ Pagamento confirmado</p>
                      )}
                    </div>
                  )}
                  {canCancel && (
                    <Button variant="destructive" className="w-full" onClick={handleLookupCancel}>
                      <XCircle className="w-4 h-4 mr-2" />Cancelar Presença
                    </Button>
                  )}
                  {!canCancel && event.cancellationDeadline && (
                    <p className="text-xs text-muted-foreground">
                      Prazo para cancelamento encerrado em {new Date(event.cancellationDeadline + 'T00:00').toLocaleDateString('pt-BR')}.
                    </p>
                  )}
                  <Button variant="outline" className="w-full" onClick={resetLookup}>Voltar</Button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <h2 className="font-display text-xl font-semibold">Status: {lookupResult.presenceStatus}</h2>
                  <p className="text-muted-foreground">{lookupResult.firstName} {lookupResult.lastName}</p>
                  <Button variant="outline" className="w-full" onClick={resetLookup}>Voltar</Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Lista de Confirmados */}
        {confirmedGuests.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-elegant p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Confirmados
              </h3>
              <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                {confirmedGuests.reduce((s, g) => s + 1 + g.companions, 0)} pessoa(s)
              </span>
            </div>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {confirmedGuests.map(g => (
                <li key={g.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                  <div>
                    <span className="font-medium text-foreground">{g.firstName} {g.lastName}</span>
                    {g.invitedBy && (
                      <span className="text-xs text-muted-foreground ml-2">• por {g.invitedBy}</span>
                    )}
                  </div>
                  {g.companions > 0 && (
                    <span className="text-xs text-muted-foreground shrink-0">+{g.companions}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lista de Desconfirmados */}
        {cancelledGuests.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-elegant p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                Desconfirmados
              </h3>
              <span className="text-sm font-medium text-destructive bg-destructive/10 px-3 py-1 rounded-full">
                {cancelledGuests.length} pessoa(s)
              </span>
            </div>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {cancelledGuests.map(g => (
                <li key={g.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                  <div>
                    <span className="font-medium text-foreground">{g.firstName} {g.lastName}</span>
                    {g.invitedBy && (
                      <span className="text-xs text-muted-foreground ml-2">• por {g.invitedBy}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Footer */}
      <div className="py-6 text-center">
        <Link to="/login" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          Administração
        </Link>
      </div>
    </div>
  );
}
