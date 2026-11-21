import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Copy, HeartHandshake } from 'lucide-react';
import { toast } from 'sonner';
import type { EventData, Guest } from '@/types/event';
import { DEFAULT_CONTRIBUTION_MESSAGE, formatBRL } from '@/lib/eventDays';

// Jornada da contribuição voluntária, mostrada depois que a inscrição já foi
// confirmada. A vaga está garantida contribuindo ou não; aqui a pessoa escolhe
// se quer contribuir e com quanto.
interface Props {
  event: EventData;
  guest: Guest;
  updateGuest: (id: string, data: Partial<Guest>) => Promise<{ error: any }>;
  onGuestChange: (g: Guest) => void;
  primaryBtnStyle?: React.CSSProperties;
}

type Etapa = 'escolher' | 'agora_nao';

export default function ContributionCard({ event, guest, updateGuest, onGuestChange, primaryBtnStyle }: Props) {
  const sugestoes = event.suggestedAmounts || [];
  const [etapa, setEtapa] = useState<Etapa>('escolher');
  const [editando, setEditando] = useState(false);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [outro, setOutro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const valorOutro = Number(outro.replace(/\./g, '').replace(',', '.'));
  const valor = selecionado ?? (Number.isFinite(valorOutro) && valorOutro > 0 ? Math.round(valorOutro * 100) / 100 : null);
  const mensagem = event.contributionMessage?.trim() || DEFAULT_CONTRIBUTION_MESSAGE;

  const copiarPix = () => {
    if (!event.pixKey) return;
    navigator.clipboard.writeText(event.pixKey);
    toast.success('Chave PIX copiada! Cole no app do seu banco.');
  };

  const contribuir = async () => {
    if (!valor) {
      toast.error('Escolha ou digite um valor.');
      return;
    }
    setSalvando(true);
    const dados: Partial<Guest> = { paymentStatus: 'pledged', amountDue: valor };
    const { error } = await updateGuest(guest.id, dados);
    setSalvando(false);
    if (error) {
      toast.error('Não conseguimos registrar agora. Tente de novo em instantes.');
      return;
    }
    onGuestChange({ ...guest, ...dados });
    setEditando(false);
  };

  // Já recebida pela equipe.
  if (guest.paymentStatus === 'paid' || (guest.amountPaid > 0 && guest.paymentStatus !== 'pledged')) {
    return (
      <div className="rounded-xl bg-success/10 p-4 text-center">
        <p className="text-sm font-medium text-success flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />Contribuição recebida
        </p>
        <p className="text-sm text-muted-foreground mt-1">Muito obrigado pela sua generosidade!</p>
      </div>
    );
  }

  // Valor escolhido, aguardando o PIX.
  if (guest.paymentStatus === 'pledged' && !editando) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center space-y-3">
        <HeartHandshake className="w-8 h-8 text-primary mx-auto" />
        <h3 className="font-display text-lg font-semibold">Obrigado pela sua generosidade!</h3>
        <p className="text-sm text-muted-foreground">Sua contribuição</p>
        <p className="text-3xl font-bold -mt-2">{formatBRL(guest.amountDue)}</p>
        {event.pixKey ? (
          <>
            <Button className="w-full" style={primaryBtnStyle} onClick={copiarPix}>
              <Copy className="w-4 h-4 mr-2" />Copiar chave PIX
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cole a chave no app do seu banco e envie o valor. Quando recebermos, a equipe confirma por aqui.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">A equipe vai te contar como fazer a contribuição.</p>
        )}
        <button type="button" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => { setEditando(true); setSelecionado(null); setOutro(''); }}>
          Mudar o valor
        </button>
      </div>
    );
  }

  if (etapa === 'agora_nao' && !editando) {
    return (
      <div className="rounded-xl bg-muted/60 p-4 text-center space-y-2">
        <p className="text-sm font-medium">Tudo bem! Sua vaga está garantida.</p>
        <p className="text-xs text-muted-foreground">Se quiser contribuir depois, é só voltar aqui em "Minha inscrição".</p>
        <Button variant="outline" size="sm" onClick={() => setEtapa('escolher')}>
          <HeartHandshake className="w-4 h-4 mr-1" />Quero contribuir
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-left space-y-4">
      <div className="text-center">
        <HeartHandshake className="w-8 h-8 text-primary mx-auto" />
        <h3 className="font-display text-lg font-semibold mt-2">Sobre a inscrição</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{mensagem}</p>

      <div>
        <p className="text-sm font-medium mb-2">Quanto você sente no coração de contribuir?</p>
        {sugestoes.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {sugestoes.map(v => (
              <button
                key={v}
                type="button"
                aria-pressed={selecionado === v}
                onClick={() => { setSelecionado(v); setOutro(''); }}
                className={`h-11 rounded-lg border text-sm font-semibold transition-colors ${
                  selecionado === v ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                {formatBRL(v).replace(',00', '')}
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
          <Input
            inputMode="decimal"
            className="pl-9 h-11"
            placeholder={sugestoes.length > 0 ? 'Outro valor' : 'Digite o valor'}
            value={outro}
            onChange={e => { setOutro(e.target.value.replace(/[^\d.,]/g, '')); setSelecionado(null); }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Button className="w-full h-11" style={primaryBtnStyle} onClick={contribuir} disabled={!valor || salvando}>
          {valor ? `Contribuir com ${formatBRL(valor)}` : 'Contribuir'}
        </Button>
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => { setEditando(false); if (guest.paymentStatus !== 'pledged') setEtapa('agora_nao'); }}
        >
          {guest.paymentStatus === 'pledged' ? 'Manter o valor anterior' : 'Agora não'}
        </Button>
      </div>
    </div>
  );
}
