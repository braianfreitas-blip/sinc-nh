import { useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PRESENCE_LABELS, PRESENCE_COLORS, PAYMENT_LABELS, PAYMENT_COLORS, isNaoInscrito, naoInscritoCategoria, WalkinCategoria } from '@/types/event';
import { Search, UserCheck, CheckCircle2, ScanLine, Loader2, XCircle, Clock, UserPlus, Baby, Undo2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import QRScanner from '@/components/QRScanner';

type ScanStatus = 'saving' | 'success' | 'already' | 'error' | 'invalid';
interface ScanResult {
  status: ScanStatus;
  name?: string;
  detail?: string;
  guestId?: string;
}

export default function CheckinPage() {
  const { event, updateGuest, getGuest, stats, addNaoInscrito, removeLastNaoInscrito } = useEvent();
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [nomeAvulso, setNomeAvulso] = useState('');
  const [salvandoAvulso, setSalvandoAvulso] = useState(false);
  const [verNaoInscritos, setVerNaoInscritos] = useState(false);

  // Apenas inscritos (não inscritos são contados no card à parte).
  const inscritos = event.guests.filter(g => !isNaoInscrito(g));
  const naoInscritos = event.guests.filter(isNaoInscrito);

  const guests = inscritos.filter(g => {
    if (!search) return true;
    return `${g.firstName} ${g.lastName}`.toLowerCase().includes(search.toLowerCase());
  });

  const checkedIn = inscritos.filter(g => g.checkedIn).length;

  const addAvulso = async (categoria: WalkinCategoria) => {
    setSalvandoAvulso(true);
    const { error } = await addNaoInscrito(categoria, nomeAvulso);
    setSalvandoAvulso(false);
    if (error) {
      toast.error('Não foi possível salvar. Verifique a conexão e tente de novo.');
    } else {
      setNomeAvulso('');
      toast.success(categoria === 'crianca' ? 'Criança não inscrita registrada!' : 'Adulto não inscrito registrado!');
    }
  };

  const desfazerAvulso = async () => {
    if (naoInscritos.length === 0) return;
    const { error } = await removeLastNaoInscrito();
    if (error) toast.error('Não foi possível desfazer. Tente de novo.');
    else toast.info('Último não inscrito removido.');
  };

  // Grava o check-in e só confirma quando salvou de verdade no banco.
  const persistCheckIn = (id: string) =>
    updateGuest(id, { checkedIn: true, checkedInAt: new Date().toISOString(), presenceStatus: 'attended' });

  // Check-in manual (botão da lista): confirma pelo resultado da gravação.
  const manualCheckIn = async (id: string, name: string) => {
    const { error } = await persistCheckIn(id);
    if (error) toast.error(`Não foi possível salvar o check-in de ${name}. Verifique a conexão e tente de novo.`);
    else toast.success(`Check-in de ${name} realizado!`);
  };

  // Check-in via QR: mostra a confirmação grande e só marca sucesso se salvou.
  const runScanCheckIn = async (id: string, fullName: string, companions: number) => {
    setScanResult({ status: 'saving', name: fullName });
    const { error } = await persistCheckIn(id);
    if (error) {
      setScanResult({ status: 'error', name: fullName, guestId: id, detail: 'Não foi possível salvar. Toque em "Tentar de novo".' });
    } else {
      setScanResult({ status: 'success', name: fullName, detail: companions > 0 ? `+${companions} acompanhante(s)` : undefined });
    }
  };

  const scanNext = () => {
    setScanResult(null);
    setScannerOpen(true);
  };

  const handleScan = (decoded: string) => {
    setScannerOpen(false);
    let guestId: string | null = null;
    let eventId: string | null = null;

    try {
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === 'object') {
        guestId = parsed.g || parsed.guestId || null;
        eventId = parsed.e || parsed.eventId || null;
      }
    } catch {
      // not JSON — try to extract /ticket/:id from URL
      const match = decoded.match(/\/ticket\/([0-9a-f-]{36})/i);
      if (match) guestId = match[1];
      else if (/^[0-9a-f-]{36}$/i.test(decoded.trim())) guestId = decoded.trim();
    }

    if (!guestId) {
      setScanResult({ status: 'invalid', detail: 'QR Code inválido. Tente escanear novamente.' });
      return;
    }

    if (eventId && eventId !== event.id) {
      setScanResult({ status: 'invalid', detail: 'Este ingresso é de outro evento.' });
      return;
    }

    const guest = getGuest(guestId);
    if (!guest) {
      setScanResult({ status: 'invalid', detail: 'Convidado não encontrado neste evento.' });
      return;
    }

    const fullName = `${guest.firstName} ${guest.lastName}`;

    if (guest.presenceStatus === 'cancelled') {
      setScanResult({ status: 'invalid', name: fullName, detail: 'Este convidado cancelou a presença.' });
      return;
    }

    if (guest.checkedIn) {
      setScanResult({
        status: 'already',
        name: fullName,
        detail: guest.checkedInAt ? `Já fez check-in às ${new Date(guest.checkedInAt).toLocaleTimeString('pt-BR')}` : 'Este convidado já fez check-in.',
      });
      return;
    }

    runScanCheckIn(guest.id, fullName, guest.companions);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Check-in</h1>
        <p className="text-muted-foreground mt-1">{checkedIn} de {inscritos.length} inscritos presentes</p>
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden max-w-md mx-auto">
          <div className="h-full bg-success rounded-full transition-all" style={{ width: `${inscritos.length > 0 ? (checkedIn / inscritos.length) * 100 : 0}%` }} />
        </div>
        <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium bg-primary/10 text-primary px-4 py-1.5 rounded-full">
          <Users className="w-4 h-4" />Presentes no total: {stats.presentesTotal}
        </div>
      </div>

      {/* Card: Não inscritos */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />Não inscritos
          </h3>
          <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-0.5 rounded-full">
            {stats.naoInscritosTotal} no total
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Quem veio sem inscrição. Um toque conta — o nome é opcional.
        </p>
        <div className="mb-3">
          <Input
            value={nomeAvulso}
            onChange={e => setNomeAvulso(e.target.value)}
            placeholder="Nome (opcional)"
            className="h-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => addAvulso('adulto')} disabled={salvandoAvulso} className="h-12 text-base" size="lg">
            <UserPlus className="w-5 h-5 mr-1" />+1 adulto
          </Button>
          <Button onClick={() => addAvulso('crianca')} disabled={salvandoAvulso} variant="secondary" className="h-12 text-base" size="lg">
            <Baby className="w-5 h-5 mr-1" />+1 criança
          </Button>
        </div>
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-muted-foreground">
            Adultos: <span className="font-semibold text-foreground">{stats.naoInscritosAdultos}</span> · Crianças: <span className="font-semibold text-foreground">{stats.naoInscritosCriancas}</span>
          </span>
          <button
            onClick={desfazerAvulso}
            disabled={stats.naoInscritosTotal === 0}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-4 h-4" />Desfazer último
          </button>
        </div>
        {naoInscritos.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <button
              onClick={() => setVerNaoInscritos(v => !v)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {verNaoInscritos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {verNaoInscritos ? 'Ocultar lista' : 'Ver não inscritos'}
            </button>
            {verNaoInscritos && (
              <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {naoInscritos.map(g => (
                  <li key={g.id} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                    <span className="text-foreground">{g.firstName || 'Sem nome'}</span>
                    <span className="text-xs text-muted-foreground">
                      {naoInscritoCategoria(g) === 'crianca' ? 'Criança' : 'Adulto'}
                      {g.checkedInAt ? ` · ${new Date(g.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {event.useTickets && (
        <Button onClick={() => setScannerOpen(true)} className="w-full h-14 text-base" size="lg">
          <ScanLine className="w-5 h-5 mr-2" />Escanear QR Code do Ingresso
        </Button>
      )}

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
                  {(() => {
                    let label = 'Check-in pendente';
                    let cls = 'bg-muted text-muted-foreground';
                    if (g.checkedIn) { label = 'Compareceu'; cls = PRESENCE_COLORS.attended; }
                    else if (g.presenceStatus === 'cancelled') { label = PRESENCE_LABELS.cancelled; cls = PRESENCE_COLORS.cancelled; }
                    else if (g.presenceStatus === 'waitlist') { label = PRESENCE_LABELS.waitlist; cls = PRESENCE_COLORS.waitlist; }
                    return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
                  })()}
                  {(() => {
                    const pay = event.isPaid ? g.paymentStatus : 'exempt';
                    return <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_COLORS[pay]}`}>{PAYMENT_LABELS[pay]}</span>;
                  })()}
                </div>
                {g.companions > 0 && <p className="text-xs text-muted-foreground mt-1">+{g.companions} acompanhante(s)</p>}
                {g.checkedIn && g.checkedInAt && (
                  <p className="text-xs text-success mt-1">Check-in: {new Date(g.checkedInAt).toLocaleTimeString('pt-BR')}</p>
                )}
              </div>
            </div>
            {!g.checkedIn ? (
              <Button onClick={() => manualCheckIn(g.id, g.firstName)} size="sm">
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

      {scannerOpen && <QRScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />}

      {scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/95 backdrop-blur">
          <div className="w-full max-w-sm text-center space-y-5">
            {scanResult.status === 'saving' && (
              <>
                <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
                <h2 className="text-2xl font-bold">Salvando check-in...</h2>
                {scanResult.name && <p className="text-lg font-medium">{scanResult.name}</p>}
              </>
            )}

            {scanResult.status === 'success' && (
              <>
                <div className="w-24 h-24 rounded-full bg-success/15 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-14 h-14 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-success">Check-in realizado!</h2>
                {scanResult.name && <p className="text-xl font-semibold">{scanResult.name}</p>}
                {scanResult.detail && <p className="text-muted-foreground">{scanResult.detail}</p>}
                <div className="space-y-2 pt-2">
                  <Button onClick={scanNext} className="w-full h-12 text-base" size="lg">
                    <ScanLine className="w-5 h-5 mr-2" />Escanear próximo
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setScanResult(null)}>Concluir</Button>
                </div>
              </>
            )}

            {scanResult.status === 'already' && (
              <>
                <div className="w-24 h-24 rounded-full bg-warning/15 flex items-center justify-center mx-auto">
                  <Clock className="w-14 h-14 text-warning" />
                </div>
                <h2 className="text-2xl font-bold text-warning">Já fez check-in</h2>
                {scanResult.name && <p className="text-xl font-semibold">{scanResult.name}</p>}
                {scanResult.detail && <p className="text-muted-foreground">{scanResult.detail}</p>}
                <div className="space-y-2 pt-2">
                  <Button onClick={scanNext} className="w-full h-12 text-base" size="lg">
                    <ScanLine className="w-5 h-5 mr-2" />Escanear próximo
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setScanResult(null)}>Concluir</Button>
                </div>
              </>
            )}

            {scanResult.status === 'error' && (
              <>
                <div className="w-24 h-24 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
                  <XCircle className="w-14 h-14 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-destructive">Não salvou</h2>
                {scanResult.name && <p className="text-xl font-semibold">{scanResult.name}</p>}
                {scanResult.detail && <p className="text-muted-foreground">{scanResult.detail}</p>}
                <div className="space-y-2 pt-2">
                  <Button
                    onClick={() => { if (scanResult.guestId && scanResult.name) runScanCheckIn(scanResult.guestId, scanResult.name, 0); }}
                    className="w-full h-12 text-base"
                    size="lg"
                  >
                    Tentar de novo
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setScanResult(null)}>Fechar</Button>
                </div>
              </>
            )}

            {scanResult.status === 'invalid' && (
              <>
                <div className="w-24 h-24 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
                  <XCircle className="w-14 h-14 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-destructive">Ingresso inválido</h2>
                {scanResult.name && <p className="text-xl font-semibold">{scanResult.name}</p>}
                {scanResult.detail && <p className="text-muted-foreground">{scanResult.detail}</p>}
                <div className="space-y-2 pt-2">
                  <Button onClick={scanNext} className="w-full h-12 text-base" size="lg">
                    <ScanLine className="w-5 h-5 mr-2" />Escanear próximo
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setScanResult(null)}>Fechar</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
