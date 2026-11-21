import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Clock, Gift, Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useEvent, mapGuest } from '@/contexts/EventContext';
import { formatBRL } from '@/lib/eventDays';
import { registerGroup, type RegisterResult } from '@/lib/registration';
import GroupStatusPanel from '@/components/GroupStatusPanel';

// Inscrição em grupo para evento com valor fixo: o responsável coloca o nome
// de cada pessoa, o total soma o valor por pessoa, é feito UM pagamento e cada
// pessoa recebe o próprio ingresso.
interface Pessoa { firstName: string; lastName: string }

interface Props {
  isFull: boolean;
  primaryBtnStyle?: React.CSSProperties;
}

export default function GroupRegistrationForm({ isFull, primaryBtnStyle }: Props) {
  const { event, reload } = useEvent();
  const [responsavel, setResponsavel] = useState<Pessoa>({ firstName: '', lastName: '' });
  const [outros, setOutros] = useState<Pessoa[]>([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [invitedBy, setInvitedBy] = useState('');
  const [codigo, setCodigo] = useState('');
  const [mostrarCodigo, setMostrarCodigo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<RegisterResult | null>(null);

  const automatico = event.paymentProvider !== 'manual';
  const pessoas = [responsavel, ...outros];
  const total = event.ticketPrice * pessoas.length;
  const label = event.ticketLabel || 'Ingresso';

  const setOutro = (i: number, campo: keyof Pessoa, v: string) =>
    setOutros(prev => prev.map((p, k) => (k === i ? { ...p, [campo]: v } : p)));

  const enviar = async () => {
    if (pessoas.some(p => !p.firstName.trim() || !p.lastName.trim())) {
      toast.error('Informe nome e sobrenome de todas as pessoas.');
      return;
    }
    if (!phone.trim()) { toast.error('Informe seu celular.'); return; }
    if (automatico && !email.trim()) { toast.error('Informe seu e-mail — ele é usado para gerar o Pix.'); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error('Informe um e-mail válido.'); return; }

    setEnviando(true);
    try {
      const r = await registerGroup({
        eventId: event.id,
        contact: { phone: phone.trim(), email: email.trim() || undefined, invitedBy: invitedBy.trim() || undefined },
        people: pessoas.map(p => ({ firstName: p.firstName.trim(), lastName: p.lastName.trim() })),
        courtesyCode: codigo.trim() || undefined,
      });
      setResultado(r);
      if (r.courtesyApplied > 0) toast.success(`Cortesia aplicada para ${r.courtesyApplied} ${r.courtesyApplied === 1 ? 'pessoa' : 'pessoas'}. 💚`);
      else if (!r.waitlist) toast.success('Inscrição feita!');
      reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const recomecar = () => {
    setResponsavel({ firstName: '', lastName: '' });
    setOutros([]);
    setPhone('');
    setEmail('');
    setInvitedBy('');
    setCodigo('');
    setMostrarCodigo(false);
    setResultado(null);
  };

  if (resultado) {
    const tudoPago = resultado.amount === 0 && !resultado.waitlist;
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${resultado.waitlist ? 'bg-warning/10' : 'bg-success/10'}`}>
            {resultado.waitlist ? <Clock className="w-8 h-8 text-warning" /> : <CheckCircle2 className="w-8 h-8 text-success" />}
          </div>
          <h2 className="font-display text-xl font-semibold">
            {resultado.waitlist ? 'Lista de espera 💚' : tudoPago ? 'Inscrição confirmada!' : 'Falta só o pagamento'}
          </h2>
          {!resultado.waitlist && !tudoPago && (
            <p className="text-sm text-muted-foreground">As vagas de {resultado.guests.length === 1 ? 'você' : `${resultado.guests.length} pessoas`} ficam garantidas quando o pagamento for aprovado.</p>
          )}
        </div>
        <GroupStatusPanel
          guestId={resultado.groupId}
          fallbackGuests={resultado.guests.map(mapGuest)}
          initialOrder={resultado.order}
          initialError={resultado.paymentError}
          primaryBtnStyle={primaryBtnStyle}
        />
        <Button variant="outline" className="w-full" onClick={recomecar}>Fazer outra inscrição</Button>
      </div>
    );
  }

  return (
    <>
      <h2 className="font-display text-xl font-semibold text-center mb-2">Inscrição</h2>
      <p className="text-sm text-muted-foreground text-center mb-6">Inscreva você e quem vai junto (família, amigos). É um pagamento só e cada pessoa recebe o próprio ingresso.</p>
      {isFull && (
        <div className="bg-warning/10 text-warning rounded-lg p-3 mb-4 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Ops! Nossas vagas já se esgotaram, mas não fique triste, Jesus te ama!</p>
            <p className="mt-1">Os nomes ficarão em uma lista de espera, caso tenhamos novas vagas você será notificado :)</p>
          </div>
        </div>
      )}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsável (pessoa 1)</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nome *</Label><Input value={responsavel.firstName} onChange={e => setResponsavel(p => ({ ...p, firstName: e.target.value }))} placeholder="João" /></div>
          <div><Label>Sobrenome *</Label><Input value={responsavel.lastName} onChange={e => setResponsavel(p => ({ ...p, lastName: e.target.value }))} placeholder="Silva" /></div>
        </div>
        <div><Label>Celular *</Label><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(51) 99999-9999" /></div>
        <div>
          <Label>E-mail{automatico ? ' *' : ' (opcional)'}</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
          {automatico && <p className="text-xs text-muted-foreground mt-1">Usado para gerar o Pix.</p>}
        </div>
        <div><Label>Quem te convidou?</Label><Input value={invitedBy} onChange={e => setInvitedBy(e.target.value)} placeholder="Nome de quem convidou" /></div>

        {outros.length > 0 && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Quem vai junto</p>}
        {outros.map((p, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1"><Label>Nome (pessoa {i + 2})</Label><Input value={p.firstName} onChange={e => setOutro(i, 'firstName', e.target.value)} /></div>
            <div className="flex-1"><Label>Sobrenome</Label><Input value={p.lastName} onChange={e => setOutro(i, 'lastName', e.target.value)} /></div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setOutros(prev => prev.filter((_, k) => k !== i))} title="Remover">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" className="w-full" onClick={() => setOutros(prev => [...prev, { firstName: '', lastName: responsavel.lastName }])} disabled={pessoas.length >= 20}>
          <UserPlus className="w-4 h-4 mr-2" />Adicionar pessoa
        </Button>

        {mostrarCodigo ? (
          <div>
            <Label className="flex items-center gap-1.5"><Gift className="w-4 h-4" />Código de cortesia</Label>
            <Input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="Ex.: GRACA-7K2P" />
            <p className="text-xs text-muted-foreground mt-1">O desconto é aplicado ao concluir a inscrição.</p>
          </div>
        ) : (
          <button type="button" className="text-xs text-muted-foreground underline mx-auto block" onClick={() => setMostrarCodigo(true)}>
            Tenho um código de cortesia
          </button>
        )}

        <div className="bg-gold-light rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">{label} · {pessoas.length} × {formatBRL(event.ticketPrice)}</p>
          <p className="text-2xl font-bold text-foreground">{formatBRL(total)}</p>
          {codigo.trim() && <p className="text-xs text-muted-foreground">Cortesia será descontada ao concluir</p>}
        </div>

        <Button onClick={enviar} className="w-full h-12 text-base" style={primaryBtnStyle} disabled={enviando}>
          {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          {isFull ? 'Entrar na lista de espera' : `Inscrever ${pessoas.length} ${pessoas.length === 1 ? 'pessoa' : 'pessoas'}`}
        </Button>
      </div>
    </>
  );
}
