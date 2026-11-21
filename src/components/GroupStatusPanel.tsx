import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, CreditCard, Gift, Loader2, QrCode, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { useEvent, mapGuest } from '@/contexts/EventContext';
import { isConfirmado, isCortesia, type Guest } from '@/types/event';
import { formatBRL } from '@/lib/eventDays';
import { fetchGroup, payGroup, type PixOrder } from '@/lib/registration';
import PixPaymentCard from '@/components/PixPaymentCard';

// Situação de uma inscrição em grupo: quem está no grupo, o Pix e os ingressos.
// Usado logo depois da inscrição e em "Minha inscrição".
interface Props {
  guestId: string;                 // qualquer pessoa do grupo (o responsável tem id = groupId)
  fallbackGuests?: Guest[];        // mostrados enquanto a lista do servidor carrega
  initialOrder?: PixOrder | null;
  initialError?: string | null;
  primaryBtnStyle?: React.CSSProperties;
}

export default function GroupStatusPanel({ guestId, fallbackGuests = [], initialOrder = null, initialError = null, primaryBtnStyle }: Props) {
  const { event } = useEvent();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PixOrder | null>(initialOrder);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(initialError);
  const [membrosServidor, setMembrosServidor] = useState<Guest[] | null>(null);

  // A lista do grupo vem do servidor (a página pública não lê a tabela de convidados).
  const carregar = useCallback(async (aproveitarPix: boolean) => {
    try {
      const r = await fetchGroup(guestId);
      setMembrosServidor(r.members.map(mapGuest));
      if (aproveitarPix && r.order) setOrder(prev => prev ?? r.order);
    } catch {
      /* mantém o que já está na tela */
    }
  }, [guestId]);

  useEffect(() => { carregar(true); }, [carregar]);

  const membros = (membrosServidor ?? fallbackGuests)
    .filter(g => g.presenceStatus !== 'cancelled')
    .sort((a, b) => (a.groupId && a.id === a.groupId ? -1 : b.groupId && b.id === b.groupId ? 1 : a.createdAt.localeCompare(b.createdAt)));

  const pendentes = membros.filter(g => (g.paymentStatus === 'pending' || g.paymentStatus === 'partial') && g.presenceStatus !== 'waitlist');
  const totalPendente = pendentes.reduce((s, g) => s + Math.max(0, g.amountDue - g.amountPaid), 0);
  const emEspera = membros.length > 0 && membros.every(g => g.presenceStatus === 'waitlist');
  const automatico = event.paymentProvider !== 'manual';

  const gerarPix = async () => {
    setGerando(true);
    setErro(null);
    try {
      const { order: o } = await payGroup(guestId);
      if (!o) await carregar(false);
      setOrder(o);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setGerando(false);
    }
  };

  const pago = async () => {
    toast.success('Pagamento aprovado! Ingressos liberados. 🎉');
    setOrder(null);
    await carregar(false);
  };

  return (
    <div className="space-y-4 text-left">
      <ul className="divide-y divide-border rounded-xl border border-border">
        {membros.map(g => (
          <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{g.firstName} {g.lastName}</p>
              <p className="text-xs text-muted-foreground">
                {g.presenceStatus === 'waitlist' ? 'Lista de espera'
                  : isCortesia(g) ? 'Cortesia'
                  : isConfirmado(g) ? 'Confirmado'
                  : `Aguardando pagamento · ${formatBRL(Math.max(0, g.amountDue - g.amountPaid))}`}
              </p>
            </div>
            {g.presenceStatus === 'waitlist' ? <Clock className="w-4 h-4 text-warning shrink-0" />
              : isCortesia(g) ? <Gift className="w-4 h-4 text-info shrink-0" />
              : isConfirmado(g) ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              : <CreditCard className="w-4 h-4 text-warning shrink-0" />}
          </li>
        ))}
      </ul>

      {emEspera && (
        <p className="text-sm text-muted-foreground text-center">As vagas esgotaram e o grupo ficou na lista de espera. Se abrir vaga, a equipe entra em contato. 🙏</p>
      )}

      {totalPendente > 0 && (
        automatico ? (
          order ? (
            <PixPaymentCard order={order} onPaid={pago} onRegenerate={gerarPix} primaryBtnStyle={primaryBtnStyle} />
          ) : (
            <div className="rounded-xl bg-warning/10 p-4 text-center space-y-3">
              <p className="text-sm font-medium text-warning">Pagamento pendente</p>
              <p className="text-2xl font-bold">{formatBRL(totalPendente)}</p>
              {erro && <p className="text-xs text-destructive">{erro}</p>}
              <Button className="w-full" style={primaryBtnStyle} onClick={gerarPix} disabled={gerando}>
                {gerando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}Pagar com Pix
              </Button>
            </div>
          )
        ) : (
          <div className="rounded-xl bg-warning/10 p-4 text-center">
            <p className="text-sm font-medium text-warning">Pagamento pendente</p>
            <p className="text-2xl font-bold mt-1">{formatBRL(totalPendente)}</p>
            {event.pixKey && (
              <Button className="mt-3 w-full" style={primaryBtnStyle} onClick={() => {
                navigator.clipboard.writeText(event.pixKey!);
                toast.success('Chave PIX copiada! Cole no app do seu banco para pagar.');
              }}>
                <CreditCard className="w-4 h-4 mr-2" />Copiar chave PIX
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-2">Faça um único Pix com o valor total. A confirmação será feita pela equipe.</p>
          </div>
        )
      )}

      {event.useTickets && membros.some(g => g.presenceStatus !== 'waitlist' && isConfirmado(g)) && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-center">Ingressos</p>
          {membros.filter(g => g.presenceStatus !== 'waitlist' && isConfirmado(g)).map(g => (
            <Button key={g.id} variant="outline" className="w-full justify-start" onClick={() => navigate(`/ticket/${g.id}`)}>
              <Ticket className="w-4 h-4 mr-2" />Ingresso de {g.firstName} {g.lastName}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
