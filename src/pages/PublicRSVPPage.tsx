import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEvent } from '@/contexts/EventContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, CheckCircle2, AlertCircle, Users, CalendarDays, XCircle, Search, CreditCard, Navigation2, Ticket, HeartHandshake } from 'lucide-react';
import { PAYMENT_LABELS, Guest, isNaoInscrito, isConfirmado } from '@/types/event';
import { toast } from 'sonner';
import sincLogo from '@/assets/sinc-logo.png';
import NotFound from '@/pages/NotFound';
import ContributionCard from '@/components/ContributionCard';
import GroupRegistrationForm from '@/components/GroupRegistrationForm';
import GroupStatusPanel from '@/components/GroupStatusPanel';
import { supabase } from '@/integrations/supabase/client';
import { mapGuest } from '@/contexts/EventContext';
import { getEventDays, formatDateRange, formatDayLine, formatHour, hasProgram } from '@/lib/eventDays';

export default function PublicRSVPPage() {
  const { event, notFound, loading, addGuest, updateGuest } = useEvent();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companions, setCompanions] = useState(0);
  const [invitedBy, setInvitedBy] = useState('');
  const [found, setFound] = useState<Guest | null>(null);
  const [searched, setSearched] = useState(false);
  const [mode, setMode] = useState<'confirm' | 'manage'>('confirm');
  const [lookupFirst, setLookupFirst] = useState('');
  const [lookupLast, setLookupLast] = useState('');
  const [lookupResult, setLookupResult] = useState<Guest | null>(null);
  const [lookupSearched, setLookupSearched] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const lookupGuest = async (first: string, last: string, ph: string): Promise<Guest | null> => {
    const { data } = await supabase.rpc('public_lookup_guest', { _event_id: event.id, _first: first, _last: last, _phone: ph });
    return data ? mapGuest(data) : null;
  };

  if (loading) return null;
  if (notFound) return <NotFound />;

  const eventDays = getEventDays(event);
  const multiDay = eventDays.length > 1;
  const comProgramacao = hasProgram(eventDays);
  // Contribuição voluntária: a vaga é garantida e o valor é escolhido no final.
  const voluntary = event.isPaid && event.contributionMode === 'voluntary';
  // Valor fixo: inscrição em grupo (cada pessoa paga o valor, um Pix só, um ingresso por pessoa).
  const grupo = event.isPaid && !voluntary;
  const valorFixo = (n: number) => (event.isPaid && !voluntary ? event.ticketPrice * (1 + (event.allowCompanions ? n : 0)) : 0);

  const confirmedCount = event.publicOccupied ?? event.guests.filter(g => !isNaoInscrito(g) && g.presenceStatus !== 'cancelled').reduce((s, g) => s + 1 + g.companions, 0);
  const isFull = confirmedCount >= event.maxGuests;

  const canCancel = !event.cancellationDeadline || new Date() <= new Date(event.cancellationDeadline + 'T23:59:59');

  const handleConfirm = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Informe nome e sobrenome.');
      return;
    }
    if (!phone.trim()) {
      toast.error('Informe seu celular.');
      return;
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error('Informe um e-mail válido.');
        return;
      }
    }
    const existing = await lookupGuest(firstName.trim(), lastName.trim(), phone.trim());
    if (existing) {
      const status = isFull ? 'waitlist' : 'confirmed';
      updateGuest(existing.id, {
        presenceStatus: status,
        confirmedAt: new Date().toISOString(),
        companions: event.allowCompanions ? companions : 0,
        amountDue: voluntary ? existing.amountDue : valorFixo(companions),
        ...(voluntary && existing.paymentStatus === 'pending' ? { paymentStatus: 'not_applicable' as const } : {}),
        invitedBy: invitedBy.trim(),
        phone: phone.trim() || existing.phone,
        email: email.trim() || existing.email,
      });
      setFound({
        ...existing,
        presenceStatus: status,
        confirmedAt: new Date().toISOString(),
        email: email.trim() || existing.email,
        ...(voluntary && existing.paymentStatus === 'pending' ? { paymentStatus: 'not_applicable' as const } : {}),
      });
      if (status !== 'waitlist') toast.success('Presença confirmada!');
    } else {
      const status = isFull ? 'waitlist' : 'confirmed';
      const guest = addGuest({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        presenceStatus: status,
        paymentStatus: voluntary ? 'not_applicable' : event.isPaid ? 'pending' : 'exempt',
        amountDue: valorFixo(companions),
        amountPaid: 0,
        companions: event.allowCompanions ? companions : 0,
        notes: '',
        invitedBy: invitedBy.trim(),
        checkedIn: false,
        confirmedAt: new Date().toISOString(),
      });
      setFound(guest);
      if (status !== 'waitlist') toast.success('Presença confirmada!');
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
  const isWaitlisted = found && found.presenceStatus === 'waitlist';

  const buildTicket = (g: Guest) => ({
    guest: {
      id: g.id,
      first_name: g.firstName,
      last_name: g.lastName,
      email: g.email ?? null,
      companions: g.companions,
      presence_status: g.presenceStatus,
      payment_status: g.paymentStatus,
      checked_in: g.checkedIn,
    },
    event: {
      id: event.id,
      slug: event.slug ?? null,
      name: event.name,
      date: event.date,
      time: event.time,
      location: event.location,
      is_paid: event.isPaid,
      ticket_label: event.ticketLabel,
      use_tickets: event.useTickets,
      days: event.days,
      logo_url: event.logoUrl ?? null,
      cover_url: event.coverUrl ?? null,
      header_bg_color: event.headerBgColor ?? null,
      header_text_color: event.headerTextColor ?? null,
      primary_color: event.primaryColor ?? null,
    },
  });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setCompanions(0);
    setInvitedBy('');
    setFound(null);
    setSearched(false);
  };

  const handleLookup = async () => {
    if (!lookupFirst.trim() || !lookupLast.trim() || !lookupPhone.trim()) {
      toast.error('Informe nome, sobrenome e celular.');
      return;
    }
    const guest = await lookupGuest(lookupFirst.trim(), lookupLast.trim(), lookupPhone.trim());
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
    setLookupPhone('');
    setLookupResult(null);
    setLookupSearched(false);
  };

  const headerStyle: React.CSSProperties = {
    ...(event.headerBgColor ? { background: event.headerBgColor } : {}),
    ...(event.headerTextColor ? { color: event.headerTextColor } : {}),
  };
  const accentStyle: React.CSSProperties = event.primaryColor ? { color: event.primaryColor } : {};
  const primaryBtnStyle: React.CSSProperties = event.primaryColor
    ? { backgroundColor: event.primaryColor, color: '#fff', borderColor: event.primaryColor }
    : {};
  const outlinePrimaryStyle: React.CSSProperties = event.primaryColor
    ? { borderColor: event.primaryColor, color: event.primaryColor }
    : {};
  const cssVars = event.primaryColor
    ? ({ ['--brand-primary' as any]: event.primaryColor } as React.CSSProperties)
    : {};

  return (
    <div className="min-h-screen bg-background" style={cssVars}>
      {/* Cover banner */}
      {event.coverUrl && (
        <div className="w-full aspect-[3/1] sm:aspect-[4/1] overflow-hidden">
          <img src={event.coverUrl} alt={event.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Hero */}
      <div
        className={event.headerBgColor ? 'py-16 px-4' : 'gradient-primary text-primary-foreground py-16 px-4'}
        style={headerStyle}
      >
        <div className="max-w-lg mx-auto text-center">
          <img
            src={event.logoUrl || sincLogo}
            alt={event.name || 'Logo'}
            className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6"
          />
          <h1 className="font-display text-4xl font-bold mb-4" style={event.headerTextColor ? { color: event.headerTextColor } : undefined}>{event.name || 'Evento'}</h1>
          {event.description && <p className="mb-6 opacity-80" style={event.headerTextColor ? { color: event.headerTextColor, opacity: 0.85 } : undefined}>{event.description}</p>}
          <div className="flex flex-wrap justify-center gap-4 text-sm opacity-80" style={event.headerTextColor ? { color: event.headerTextColor, opacity: 0.85 } : undefined}>
            {multiDay ? (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                {formatDateRange(eventDays)} · {eventDays.length} dias
              </span>
            ) : (
              <>
                {event.date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" />
                    {new Date(event.date + 'T00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
                {event.time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{eventDays[0]?.end ? `${event.time} às ${eventDays[0].end}` : event.time}</span>}
              </>
            )}
            {event.location && (
              <span className="flex items-center gap-1 flex-wrap">
                <MapPin className="w-4 h-4" />{event.location}
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors" title="Google Maps">
                  <MapPin className="w-3.5 h-3.5" style={accentStyle} />
                </a>
                <a href={`https://waze.com/ul?q=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors" title="Waze">
                  <Navigation2 className="w-3.5 h-3.5" style={accentStyle} />
                </a>
              </span>
            )}
          </div>
          {comProgramacao ? (
            <div className="mt-6 text-left rounded-2xl bg-primary-foreground/10 px-5 py-4 max-w-sm mx-auto" style={event.headerTextColor ? { color: event.headerTextColor } : undefined}>
              <p className="text-xs uppercase tracking-wider opacity-70 mb-3">Programação</p>
              <div className="space-y-4">
                {eventDays.map(d => (
                  <div key={d.date}>
                    <p className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4 opacity-80" />{formatDayLine({ ...d, start: '', end: undefined })}</p>
                    {d.sessions && d.sessions.length > 0 ? (
                      <ul className="mt-1.5 ml-6 space-y-1 text-sm">
                        {d.sessions.map((ss, k) => (
                          <li key={k} className="flex gap-3">
                            <span className="w-12 shrink-0 tabular-nums opacity-80">{formatHour(ss.time)}</span>
                            <span>{ss.title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      d.start && <p className="mt-1 ml-6 text-sm opacity-80">{formatDayLine(d).split(' · ').slice(1).join(' · ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : multiDay && (
            <ul className="mt-5 inline-flex flex-col gap-1.5 text-sm text-left rounded-xl bg-primary-foreground/10 px-4 py-3" style={event.headerTextColor ? { color: event.headerTextColor } : undefined}>
              {eventDays.map(d => (
                <li key={d.date} className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 opacity-70" />{formatDayLine(d)}</li>
              ))}
            </ul>
          )}
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
            style={mode === 'confirm' ? primaryBtnStyle : outlinePrimaryStyle}
            onClick={() => { setMode('confirm'); resetLookup(); }}
          >
            {grupo ? 'Inscrever' : 'Confirmar Presença'}
          </Button>
          <Button
            variant={mode === 'manage' ? 'default' : 'outline'}
            className="flex-1"
            style={mode === 'manage' ? primaryBtnStyle : outlinePrimaryStyle}
            onClick={() => { setMode('manage'); resetForm(); }}
          >
            <Search className="w-4 h-4 mr-2" />Minha inscrição
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-elegant p-8">
          {mode === 'confirm' && grupo ? (
            <GroupRegistrationForm isFull={isFull} primaryBtnStyle={primaryBtnStyle} />
          ) : mode === 'confirm' ? (
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
              ) : isWaitlisted ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-warning" />
                  </div>
                  <h2 className="font-display text-2xl font-semibold">Você está na lista de espera 💚</h2>
                  <p className="text-muted-foreground">{found!.firstName}, guardamos o seu nome com todo carinho!</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Só pra ser sincero com você: entrar na lista de espera ainda <span className="font-medium text-foreground">não garante</span> a sua vaga. Mas fica tranquilo(a) — se abrir um lugar e um ingresso for gerado pra você, a gente te avisa na hora. 🙏
                  </p>
                  <Button variant="outline" className="w-full" onClick={resetForm}>Voltar</Button>
                </div>
              ) : !isConfirmed ? (
                <>
                  <h2 className="font-display text-xl font-semibold text-center mb-6">Confirme sua Presença</h2>
                  {isFull && (
                    <div className="bg-warning/10 text-warning rounded-lg p-3 mb-4 flex items-start gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Ops! Nossas vagas já se esgotaram, mas não fique triste, Jesus te ama!</p>
                        <p className="mt-1">Seu nome ficará em uma lista de espera, caso tenhamos novas vagas você será notificado :)</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div><Label>Nome *</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="João" /></div>
                    <div><Label>Sobrenome *</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Silva" /></div>
                    <div><Label>Celular *</Label><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(51) 99999-9999" /></div>
                    {event.useTickets && (
                      <div>
                        <Label>E-mail (opcional)</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                        <p className="text-xs text-muted-foreground mt-1">Opcional</p>
                      </div>
                    )}
                    <div><Label>Quem te convidou?</Label><Input value={invitedBy} onChange={e => setInvitedBy(e.target.value)} placeholder="Nome de quem convidou" /></div>
                    {event.allowCompanions && (
                      <div>
                        <Label>Acompanhantes (máx: {event.maxCompanions})</Label>
                        <Input type="number" min={0} max={event.maxCompanions} value={companions} onChange={e => setCompanions(Math.min(Number(e.target.value), event.maxCompanions))} />
                      </div>
                    )}
                    {voluntary && (
                      <div className="bg-gold-light rounded-lg p-4 text-center">
                        <HeartHandshake className="w-5 h-5 mx-auto text-foreground" />
                        <p className="text-sm text-foreground mt-2 leading-relaxed">Confirme sua inscrição e, se desejar, semeie uma oferta de qualquer valor para contribuir com este propósito. Sua contribuição é voluntária e não é obrigatória.</p>
                      </div>
                    )}
                    {event.isPaid && !voluntary && (
                      <div className="bg-gold-light rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground">{event.ticketLabel || 'Ingresso'}</p>
                        <p className="text-2xl font-bold text-foreground">
                          {(event.ticketPrice * (1 + companions)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        {companions > 0 && <p className="text-xs text-muted-foreground">({1 + companions} pessoas)</p>}
                      </div>
                    )}
                    <Button onClick={handleConfirm} className="w-full h-12 text-base" style={primaryBtnStyle}>
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
                  {event.isPaid && !voluntary && (found!.paymentStatus === 'pending' || found!.paymentStatus === 'partial') && (
                    <div className="bg-warning/10 rounded-lg p-4 mt-4">
                      <p className="text-sm font-medium text-warning">Pagamento pendente</p>
                      <p className="text-2xl font-bold mt-1">{(found!.amountDue - found!.amountPaid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      {event.pixKey && (
                        <Button className="mt-3 w-full" style={primaryBtnStyle} onClick={() => {
                          navigator.clipboard.writeText(event.pixKey!);
                          toast.success('Chave PIX copiada! Cole no app do seu banco para pagar.');
                        }}>
                          <CreditCard className="w-4 h-4 mr-2" />Clique para copiar chave PIX
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">A confirmação do pagamento será feita pelo administrador.</p>
                    </div>
                  )}
                  {event.isPaid && !voluntary && found!.paymentStatus === 'paid' && (
                    <div className="bg-success/10 rounded-lg p-4 mt-4">
                      <p className="text-sm font-medium text-success">✓ Pagamento aprovado</p>
                    </div>
                  )}
                  {voluntary && (
                    <ContributionCard event={event} guest={found!} updateGuest={updateGuest} onGuestChange={g => setFound(g)} primaryBtnStyle={primaryBtnStyle} />
                  )}
                  {event.useTickets && (found!.presenceStatus === 'confirmed' || found!.presenceStatus === 'attended') && isConfirmado(found!) && (
                    <Button className="w-full" style={primaryBtnStyle} onClick={() => navigate(`/ticket/${found!.id}`, { state: { ticket: buildTicket(found!) } })}>
                      <Ticket className="w-4 h-4 mr-2" />Ver meu Ingresso
                    </Button>
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
                    <div><Label>Celular usado na inscrição *</Label><Input type="tel" value={lookupPhone} onChange={e => setLookupPhone(e.target.value)} placeholder="(11) 91234-5678" /></div>
                    <Button onClick={handleLookup} className="w-full h-12 text-base" style={primaryBtnStyle}>
                      <Search className="w-4 h-4 mr-2" />Buscar
                    </Button>
                  </div>
                  {lookupSearched && !lookupResult && (
                    <p className="text-sm text-muted-foreground text-center mt-4">Nenhuma confirmação encontrada com esse nome e celular.</p>
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
                  {voluntary && (
                    <ContributionCard event={event} guest={lookupResult} updateGuest={updateGuest} onGuestChange={g => setLookupResult(g)} primaryBtnStyle={primaryBtnStyle} />
                  )}
                  {grupo && (
                    <GroupStatusPanel key={lookupResult.id} guestId={lookupResult.id} fallbackGuests={[lookupResult]} primaryBtnStyle={primaryBtnStyle} />
                  )}
                  {event.isPaid && !voluntary && !grupo && (
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
                          {event.pixKey && (
                            <Button className="mt-3 w-full" style={primaryBtnStyle} onClick={() => {
                              navigator.clipboard.writeText(event.pixKey!);
                              toast.success('Chave PIX copiada! Cole no app do seu banco para pagar.');
                            }}>
                              <CreditCard className="w-4 h-4 mr-2" />Clique para copiar chave PIX
                            </Button>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">A confirmação do pagamento será feita pelo administrador.</p>
                        </>
                      )}
                      {lookupResult.paymentStatus === 'paid' && (
                        <p className="text-sm text-success mt-1">✓ Pagamento confirmado</p>
                      )}
                    </div>
                  )}
                  {event.useTickets && isConfirmado(lookupResult) && !grupo && (
                    <Button className="w-full" style={primaryBtnStyle} onClick={() => navigate(`/ticket/${lookupResult.id}`, { state: { ticket: buildTicket(lookupResult) } })}>
                      <Ticket className="w-4 h-4 mr-2" />Ver meu Ingresso
                    </Button>
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
