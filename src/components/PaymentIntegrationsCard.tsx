import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle2, CircleDashed, Plug } from 'lucide-react';
import type { PaymentProvider } from '@/types/event';
import { providersConfig, type ProviderConfig } from '@/lib/registration';

// Configurações → Integrações de pagamento. Escolhe como o Pix é cobrado.
// Para um provedor novo: implementar em supabase/functions/_shared/payments/
// e liberar a opção aqui.
interface Props {
  value: PaymentProvider;
  onChange: (v: PaymentProvider) => void;
}

const OPCOES: { id: PaymentProvider; titulo: string; desc: string; emBreve?: boolean }[] = [
  { id: 'manual', titulo: 'Manual (chave PIX)', desc: 'A pessoa copia a chave PIX e a equipe confirma o pagamento na lista de convidados.' },
  { id: 'mercadopago', titulo: 'Mercado Pago', desc: 'Gera o QR Code Pix com o valor certo e confirma sozinho quando o pagamento cai.' },
  { id: 'stripe', titulo: 'Stripe', desc: 'Integração preparada para o futuro.', emBreve: true },
];

export default function PaymentIntegrationsCard({ value, onChange }: Props) {
  const [config, setConfig] = useState<ProviderConfig[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    providersConfig().then(r => setConfig(r.providers)).catch(() => setErro(true));
  }, []);

  const configurado = (id: PaymentProvider) => id === 'manual' || !!config?.find(c => c.id === id)?.configured;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2"><Plug className="w-4 h-4" />Integrações de pagamento</Label>
      <div className="grid grid-cols-1 gap-2">
        {OPCOES.map(op => (
          <button
            key={op.id}
            type="button"
            disabled={op.emBreve}
            onClick={() => onChange(op.id)}
            className={`text-left rounded-lg border p-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${value === op.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{op.titulo}</p>
              {op.emBreve ? (
                <Badge variant="secondary">Em breve</Badge>
              ) : op.id !== 'manual' && config ? (
                configurado(op.id)
                  ? <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3.5 h-3.5" />Conectado</span>
                  : <span className="flex items-center gap-1 text-xs text-muted-foreground"><CircleDashed className="w-3.5 h-3.5" />Falta configurar</span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{op.desc}</p>
          </button>
        ))}
      </div>
      {value === 'mercadopago' && config && !configurado('mercadopago') && (
        <p className="text-xs rounded-lg bg-warning/10 text-warning p-3">
          Para ativar, salve o <b>Access Token de produção</b> do Mercado Pago como segredo <code>MERCADOPAGO_ACCESS_TOKEN</code> no Lovable Cloud.
          Enquanto isso, as inscrições ficam com pagamento pendente.
        </p>
      )}
      {erro && <p className="text-xs text-muted-foreground">Não foi possível conferir as integrações agora (a função <code>registration</code> já foi publicada?).</p>}
    </div>
  );
}
