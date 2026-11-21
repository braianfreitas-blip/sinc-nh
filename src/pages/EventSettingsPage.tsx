import { useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, MapPin, Navigation, Palette, Plus, Trash2, CalendarDays, HeartHandshake, ListOrdered, X } from 'lucide-react';
import { EventDay, ContributionMode, PaymentProvider } from '@/types/event';
import { getEventDays, DEFAULT_CONTRIBUTION_MESSAGE, sortSessions } from '@/lib/eventDays';
import EventImageUpload from '@/components/EventImageUpload';
import PaymentIntegrationsCard from '@/components/PaymentIntegrationsCard';
import CourtesyCodesCard from '@/components/CourtesyCodesCard';

// Só monta o formulário depois que o evento carregou; senão os campos começam
// vazios (ao recarregar a página aqui) e salvar apagaria os dados do evento.
export default function EventSettingsPage() {
  const { loading, event } = useEvent();
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  return <EventSettingsForm key={event.id} />;
}

function EventSettingsForm() {
  const { event, updateEvent } = useEvent();
  const initialDays = getEventDays(event);
  const [days, setDays] = useState<EventDay[]>(initialDays.length > 0 ? initialDays : [{ date: '', start: '' }]);
  const [form, setForm] = useState({
    name: event.name,
    slug: event.slug || '',
    date: event.date,
    time: event.time,
    location: event.location,
    description: event.description,
    isPaid: event.isPaid,
    ticketPrice: event.ticketPrice,
    ticketLabel: event.ticketLabel || 'Ingresso',
    maxGuests: event.maxGuests,
    allowCompanions: event.allowCompanions,
    maxCompanions: event.maxCompanions,
    cancellationDeadline: event.cancellationDeadline || '',
    headerTextColor: event.headerTextColor || '',
    headerBgColor: event.headerBgColor || '',
    primaryColor: event.primaryColor || '',
    logoUrl: event.logoUrl as string | undefined,
    coverUrl: event.coverUrl as string | undefined,
    pixKey: event.pixKey || '',
    useTickets: event.useTickets || false,
    contributionMode: (event.contributionMode || 'fixed') as ContributionMode,
    suggestedAmountsText: (event.suggestedAmounts || []).map(v => String(v).replace('.', ',')).join(', '),
    contributionMessage: event.contributionMessage || '',
    paymentProvider: (event.paymentProvider || 'manual') as PaymentProvider,
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Nome do evento é obrigatório.'); return; }
    const preenchidos = days.filter(d => d.date);
    const datas = preenchidos.map(d => d.date);
    if (new Set(datas).size !== datas.length) { toast.error('Há dois dias com a mesma data.'); return; }
    const diasOrdenados = [...preenchidos]
      .map(d => {
        const sessions = sortSessions((d.sessions || []).filter(x => x.title.trim()).map(x => ({ time: x.time || '', title: x.title.trim() })));
        return { date: d.date, start: d.start || '', ...(d.end ? { end: d.end } : {}), ...(sessions.length ? { sessions } : {}) };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    // Valores sugeridos: números inteiros separados por vírgula ou espaço (ex.: 20, 50, 100).
    const sugeridos = form.suggestedAmountsText
      .split(/[\s;,/]+/)
      .map(t => Number(t.replace(/[^\d]/g, '')))
      .filter(n => Number.isFinite(n) && n > 0);
    const { suggestedAmountsText, paymentProvider, ...rest } = form;
    updateEvent({
      ...rest,
      // Só envia quando mudou (assim salvar funciona mesmo antes de rodar o SQL novo).
      ...(paymentProvider !== event.paymentProvider ? { paymentProvider } : {}),
      // O primeiro dia continua em date/time para tudo que já usa esses campos.
      date: diasOrdenados[0]?.date || '',
      time: diasOrdenados[0]?.start || '',
      days: diasOrdenados,
      suggestedAmounts: Array.from(new Set(sugeridos)).sort((a, b) => a - b),
    });
    setDays(diasOrdenados.length > 0 ? diasOrdenados : [{ date: '', start: '' }]);
    toast.success('Configurações salvas!');
  };

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  // Persist image URL immediately so user doesn't lose it if they navigate away
  const handleImageChange = (key: 'logoUrl' | 'coverUrl', url: string | undefined) => {
    update(key, url);
    updateEvent({ [key]: url });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações do Evento</h1>
        <p className="text-muted-foreground mt-1">Defina os detalhes do seu evento</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
        <div><Label>Nome do Evento *</Label><Input value={form.name} onChange={e => update('name', e.target.value)} /></div>
        <div>
          <Label>Slug (URL amigável)</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">{window.location.origin}/event/</span>
            <Input 
              value={form.slug} 
              onChange={e => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
              placeholder="festa-aniversario" 
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Deixe vazio para usar o ID padrão. Apenas letras minúsculas, números e hífens.</p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />{days.length > 1 ? `Datas (${days.length} dias)` : 'Data'}</Label>
          </div>
          <div className="space-y-3 mt-2">
            {days.map((d, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                {days.length > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Dia {i + 1}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDays(prev => prev.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4 mr-1" />Remover
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div><Label className="text-xs">Data</Label><Input type="date" value={d.date} onChange={e => setDays(prev => prev.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} /></div>
                  <div><Label className="text-xs">Início</Label><Input type="time" value={d.start} onChange={e => setDays(prev => prev.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} /></div>
                  <div><Label className="text-xs">Término (opcional)</Label><Input type="time" value={d.end || ''} onChange={e => setDays(prev => prev.map((x, j) => j === i ? { ...x, end: e.target.value || undefined } : x))} /></div>
                </div>
                {/* Programação do dia (sessões) */}
                <div className="pt-1">
                  {(d.sessions?.length ?? 0) > 0 && (
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5"><ListOrdered className="w-3.5 h-3.5" />Programação</p>
                  )}
                  <div className="space-y-2">
                    {(d.sessions || []).map((ss, k) => (
                      <div key={k} className="flex gap-2">
                        <Input
                          type="time"
                          className="w-36 shrink-0"
                          aria-label="Horário"
                          value={ss.time}
                          onChange={e => setDays(prev => prev.map((x, j) => j === i ? { ...x, sessions: (x.sessions || []).map((y, m) => m === k ? { ...y, time: e.target.value } : y) } : x))}
                        />
                        <Input
                          placeholder="Ex.: Abertura, Sessão 1, Intervalo"
                          aria-label="Título"
                          value={ss.title}
                          onChange={e => setDays(prev => prev.map((x, j) => j === i ? { ...x, sessions: (x.sessions || []).map((y, m) => m === k ? { ...y, title: e.target.value } : y) } : x))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground"
                          title="Remover item"
                          onClick={() => setDays(prev => prev.map((x, j) => j === i ? { ...x, sessions: (x.sessions || []).filter((_, m) => m !== k) } : x))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-8 px-2 text-primary"
                    onClick={() => setDays(prev => prev.map((x, j) => j === i ? { ...x, sessions: [...(x.sessions || []), { time: '', title: '' }] } : x))}
                  >
                    <Plus className="w-4 h-4 mr-1" />Adicionar item da programação
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setDays(prev => [...prev, { date: '', start: prev[prev.length - 1]?.start || '' }])}>
            <Plus className="w-4 h-4 mr-1" />Adicionar dia
          </Button>
          <p className="text-xs text-muted-foreground mt-1">Para seminários e encontros de vários dias, adicione um dia para cada data. A pessoa se inscreve uma vez só e o check-in é feito dia a dia. Em cada dia você pode montar a programação (abertura, sessões, intervalos), que aparece na página pública e no ingresso.</p>
        </div>
        <div>
          <Label>Local</Label>
          <Input value={form.location} onChange={e => update('location', e.target.value)} placeholder="Digite o endereço do evento" />
          {form.location && (
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.location)}`} target="_blank" rel="noopener noreferrer">
                  <MapPin className="w-4 h-4 mr-1" />Google Maps
                </a>
              </Button>
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={`https://waze.com/ul?q=${encodeURIComponent(form.location)}`} target="_blank" rel="noopener noreferrer">
                  <Navigation className="w-4 h-4 mr-1" />Waze
                </a>
              </Button>
            </div>
          )}
        </div>
        <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} /></div>
        <div><Label>Limite de Convidados</Label><Input type="number" value={form.maxGuests} onChange={e => update('maxGuests', Number(e.target.value))} /></div>
        <div><Label>Data Limite para Cancelamento</Label><Input type="date" value={form.cancellationDeadline} onChange={e => update('cancellationDeadline', e.target.value)} /><p className="text-xs text-muted-foreground mt-1">Convidados podem desconfirmar até esta data</p></div>
      </div>

      {/* Identidade Visual */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-6">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">Identidade Visual</h3>
        </div>
        <p className="text-xs text-muted-foreground -mt-3">
          Personalize a aparência das páginas públicas (RSVP e ingresso) deste evento. Se nada for definido, usamos a identidade SINC padrão.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <Label className="mb-2 block">Logo do evento</Label>
            <EventImageUpload
              value={form.logoUrl}
              onChange={url => handleImageChange('logoUrl', url)}
              eventId={event.id}
              kind="logo"
              aspect="square"
              hint="Quadrado, mín. 200×200px. Aparece no topo do RSVP e do ingresso."
            />
          </div>
          <div>
            <Label className="mb-2 block">Imagem de capa / banner</Label>
            <EventImageUpload
              value={form.coverUrl}
              onChange={url => handleImageChange('coverUrl', url)}
              eventId={event.id}
              kind="cover"
              aspect="wide"
              hint="Banner amplo (3:1). Aparece no topo da página de RSVP."
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Cor primária (destaque)</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.primaryColor || '#39FF14'}
                onChange={e => update('primaryColor', e.target.value)}
                className="w-10 h-10 rounded border border-border cursor-pointer shrink-0"
              />
              <Input
                value={form.primaryColor}
                onChange={e => update('primaryColor', e.target.value)}
                placeholder="#39FF14"
              />
              {form.primaryColor && (
                <Button variant="ghost" size="icon" onClick={() => update('primaryColor', '')} title="Resetar">
                  ×
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Botões e ícones de destaque</p>
          </div>

          <div>
            <Label>Fundo do cabeçalho</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.headerBgColor || '#0a0a0a'}
                onChange={e => update('headerBgColor', e.target.value)}
                className="w-10 h-10 rounded border border-border cursor-pointer shrink-0"
              />
              <Input
                value={form.headerBgColor}
                onChange={e => update('headerBgColor', e.target.value)}
                placeholder="#0a0a0a"
              />
              {form.headerBgColor && (
                <Button variant="ghost" size="icon" onClick={() => update('headerBgColor', '')} title="Resetar">
                  ×
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Topo do RSVP e do ingresso</p>
          </div>

          <div>
            <Label>Cor do texto do cabeçalho</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.headerTextColor || '#ffffff'}
                onChange={e => update('headerTextColor', e.target.value)}
                className="w-10 h-10 rounded border border-border cursor-pointer shrink-0"
              />
              <Input
                value={form.headerTextColor}
                onChange={e => update('headerTextColor', e.target.value)}
                placeholder="#ffffff"
              />
              {form.headerTextColor && (
                <Button variant="ghost" size="icon" onClick={() => update('headerTextColor', '')} title="Resetar">
                  ×
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Título e datas no topo</p>
          </div>
        </div>

        {/* Preview */}
        <div>
          <Label className="mb-2 block">Pré-visualização</Label>
          <div
            className="rounded-xl overflow-hidden border border-border"
            style={{
              background: form.headerBgColor || undefined,
              color: form.headerTextColor || undefined,
            }}
          >
            {form.coverUrl && (
              <div className="aspect-[3/1] w-full overflow-hidden">
                <img src={form.coverUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6 text-center">
              {form.logoUrl && (
                <img src={form.logoUrl} alt="" className="w-16 h-16 rounded-xl object-cover mx-auto mb-3" />
              )}
              <h4 className="font-display text-2xl font-bold">{form.name || 'Nome do evento'}</h4>
              <button
                type="button"
                className="mt-4 px-5 py-2 rounded-lg font-medium text-sm"
                style={{
                  background: form.primaryColor || 'hsl(var(--primary))',
                  color: '#000',
                }}
              >
                Confirmar Presença
              </button>
            </div>
          </div>
        </div>
      </div>


      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
        <h3 className="font-display text-lg font-semibold">Pagamento</h3>
        <div className="flex items-center justify-between">
          <div>
            <Label>Evento Pago</Label>
            <p className="text-xs text-muted-foreground">Ative para cobrar ingresso</p>
          </div>
          <Switch checked={form.isPaid} onCheckedChange={v => update('isPaid', v)} />
        </div>
        {form.isPaid && (
          <div className="space-y-4">
            <div>
              <Label>Como cobrar</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {([
                  { v: 'fixed', titulo: 'Valor fixo', desc: 'Todos pagam o mesmo valor para garantir a vaga.' },
                  { v: 'voluntary', titulo: 'Contribuição voluntária', desc: 'Cada um contribui com o que sentir no coração. A vaga é garantida mesmo sem contribuir.' },
                ] as const).map(op => (
                  <button
                    key={op.v}
                    type="button"
                    onClick={() => update('contributionMode', op.v)}
                    className={`text-left rounded-lg border p-3 transition-colors ${form.contributionMode === op.v ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                  >
                    <p className="text-sm font-medium flex items-center gap-1.5">{op.v === 'voluntary' && <HeartHandshake className="w-4 h-4 text-primary" />}{op.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1">{op.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Nome da Cobrança</Label><Input placeholder="Ex: Retiro, Burguer, Churras, Seminário" value={form.ticketLabel} onChange={e => update('ticketLabel', e.target.value)} /><p className="text-xs text-muted-foreground mt-1">Esse nome aparecerá para os convidados</p></div>
            {form.contributionMode === 'fixed' ? (
              <div><Label>Valor - {form.ticketLabel || 'Ingresso'} (R$)</Label><Input type="number" step="0.01" value={form.ticketPrice} onChange={e => update('ticketPrice', Number(e.target.value))} /></div>
            ) : (
              <>
                <div>
                  <Label>Valores sugeridos (R$)</Label>
                  <Input value={form.suggestedAmountsText} onChange={e => update('suggestedAmountsText', e.target.value)} placeholder="Ex.: 20, 50, 100" />
                  <p className="text-xs text-muted-foreground mt-1">Aparecem como botões para ajudar quem não sabe quanto contribuir. A pessoa também pode digitar outro valor.</p>
                </div>
                <div>
                  <Label>Mensagem sobre a contribuição</Label>
                  <Textarea rows={4} value={form.contributionMessage} onChange={e => update('contributionMessage', e.target.value)} placeholder={DEFAULT_CONTRIBUTION_MESSAGE} />
                  <p className="text-xs text-muted-foreground mt-1">Aparece no final da inscrição. Se ficar vazio, usamos o texto de exemplo acima.</p>
                </div>
              </>
            )}
            {form.contributionMode === 'fixed' && (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted p-3">
                Com valor fixo, a inscrição é em grupo: o responsável coloca o nome de cada pessoa, o total soma {form.ticketPrice > 0 ? `R$ ${String(form.ticketPrice).replace('.', ',')}` : 'o valor'} por pessoa, é feito um pagamento só e cada pessoa recebe o próprio ingresso (ative "Usar Ticket" abaixo).
              </p>
            )}
            {form.contributionMode === 'fixed' && (
              <PaymentIntegrationsCard value={form.paymentProvider} onChange={v => update('paymentProvider', v)} />
            )}
            {(form.contributionMode !== 'fixed' || form.paymentProvider === 'manual') && (
              <div><Label>Chave PIX</Label><Input value={form.pixKey} onChange={e => update('pixKey', e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" /><p className="text-xs text-muted-foreground mt-1">Será utilizada no botão "Pagar agora" da página pública</p></div>
            )}
          </div>
        )}
      </div>

      {form.isPaid && form.contributionMode === 'fixed' && <CourtesyCodesCard eventId={event.id} />}

      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
        <h3 className="font-display text-lg font-semibold">Acompanhantes</h3>
        <div className="flex items-center justify-between">
          <div>
            <Label>Permitir Acompanhantes</Label>
            <p className="text-xs text-muted-foreground">Convidados poderão trazer acompanhantes</p>
          </div>
          <Switch checked={form.allowCompanions} onCheckedChange={v => update('allowCompanions', v)} />
        </div>
        {form.allowCompanions && (
          <div><Label>Máximo de Acompanhantes por Convidado</Label><Input type="number" min={1} value={form.maxCompanions} onChange={e => update('maxCompanions', Number(e.target.value))} /></div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
        <h3 className="font-display text-lg font-semibold">Ingressos</h3>
        <div className="flex items-center justify-between">
          <div>
            <Label>Usar Ticket</Label>
            <p className="text-xs text-muted-foreground">Gera um ingresso com QR Code para cada convidado e exige e-mail na confirmação</p>
          </div>
          <Switch checked={form.useTickets} onCheckedChange={v => update('useTickets', v)} />
        </div>
      </div>

      <Button onClick={handleSave} className="w-full sm:w-auto"><Save className="w-4 h-4 mr-2" />Salvar Configurações</Button>
    </div>
  );
}
