import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Copy, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { orderStatus, type PixOrder } from '@/lib/registration';
import { formatBRL } from '@/lib/eventDays';

// Mostra o Pix (QR + copia e cola) e acompanha sozinho até o pagamento cair.
interface Props {
  order: PixOrder;
  onPaid: (order: PixOrder) => void;
  onRegenerate?: () => void; // gerar outro Pix quando este vencer
  primaryBtnStyle?: React.CSSProperties;
}

export default function PixPaymentCard({ order: initial, onPaid, onRegenerate, primaryBtnStyle }: Props) {
  const [order, setOrder] = useState(initial);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(Date.now());
  const paidRef = useRef(false);

  useEffect(() => setOrder(initial), [initial]);

  const check = async (manual = false) => {
    if (paidRef.current) return;
    if (manual) setChecking(true);
    try {
      const { order: fresh } = await orderStatus(order.id);
      setOrder(fresh);
      if (fresh.status === 'paid' && !paidRef.current) {
        paidRef.current = true;
        onPaid(fresh);
      } else if (manual && fresh.status === 'pending') {
        toast.info('Ainda não recebemos o pagamento. Assim que cair, esta tela atualiza sozinha.');
      }
    } catch (err: any) {
      if (manual) toast.error(err.message);
    } finally {
      if (manual) setChecking(false);
    }
  };

  // Confere a cada 5 segundos enquanto estiver pendente.
  useEffect(() => {
    if (order.status !== 'pending') return;
    const t = setInterval(() => check(false), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, order.status]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const msLeft = order.expiresAt ? new Date(order.expiresAt).getTime() - now : null;
  const vencido = order.status === 'expired' || order.status === 'cancelled' || order.status === 'failed' || (msLeft !== null && msLeft <= 0);

  if (order.status === 'paid') {
    return (
      <div className="rounded-xl bg-success/10 p-4 text-center">
        <CheckCircle2 className="w-6 h-6 text-success mx-auto" />
        <p className="text-sm font-medium text-success mt-2">Pagamento de {formatBRL(order.amount)} aprovado!</p>
      </div>
    );
  }

  if (vencido) {
    return (
      <div className="rounded-xl bg-warning/10 p-4 text-center space-y-3">
        <p className="text-sm font-medium text-warning">Este Pix venceu.</p>
        {onRegenerate && (
          <Button className="w-full" style={primaryBtnStyle} onClick={onRegenerate}>
            <RefreshCw className="w-4 h-4 mr-2" />Gerar novo Pix
          </Button>
        )}
      </div>
    );
  }

  const copiar = () => {
    if (!order.qrCode) return;
    navigator.clipboard.writeText(order.qrCode);
    toast.success('Código Pix copiado! Cole no app do seu banco.');
  };

  const mm = msLeft !== null ? Math.floor(msLeft / 60000) : null;
  const ss = msLeft !== null ? Math.floor((msLeft % 60000) / 1000) : null;

  return (
    <div className="rounded-xl border border-border p-4 space-y-3 text-center">
      <p className="text-sm text-muted-foreground">Pague com Pix</p>
      <p className="text-3xl font-bold">{formatBRL(order.amount)}</p>
      <div className="flex justify-center">
        {order.qrCodeBase64 ? (
          <img src={`data:image/png;base64,${order.qrCodeBase64}`} alt="QR Code Pix" className="w-52 h-52" />
        ) : order.qrCode ? (
          <div className="bg-white p-3 rounded-lg"><QRCodeSVG value={order.qrCode} size={192} /></div>
        ) : null}
      </div>
      <Button className="w-full" style={primaryBtnStyle} onClick={copiar}>
        <Copy className="w-4 h-4 mr-2" />Copiar código Pix (copia e cola)
      </Button>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Aguardando pagamento{mm !== null && ss !== null ? ` · vence em ${mm}:${String(ss).padStart(2, '0')}` : ''}
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={() => check(true)} disabled={checking}>
        {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Já paguei
      </Button>
      <p className="text-xs text-muted-foreground">A confirmação é automática — os ingressos aparecem aqui assim que o pagamento cair.</p>
    </div>
  );
}
