import { useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, MapPin, Navigation, Palette } from 'lucide-react';
import EventImageUpload from '@/components/EventImageUpload';

export default function EventSettingsPage() {
  const { event, updateEvent } = useEvent();
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
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Nome do evento é obrigatório.'); return; }
    updateEvent(form);
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
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Data</Label><Input type="date" value={form.date} onChange={e => update('date', e.target.value)} /></div>
          <div><Label>Horário</Label><Input type="time" value={form.time} onChange={e => update('time', e.target.value)} /></div>
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
        <div>
          <Label>Cor do Texto do Header (Página Pública)</Label>
          <div className="flex items-center gap-3 mt-1">
            <input type="color" value={form.headerTextColor || '#ffffff'} onChange={e => update('headerTextColor', e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
            <Input value={form.headerTextColor} onChange={e => update('headerTextColor', e.target.value)} placeholder="#ffffff" className="max-w-[150px]" />
            {form.headerTextColor && <Button variant="ghost" size="sm" onClick={() => update('headerTextColor', '')}>Resetar</Button>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Cor do título e data de confirmação no topo da página pública</p>
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
            <div><Label>Nome da Cobrança</Label><Input placeholder="Ex: Retiro, Burguer, Churras, Seminário" value={form.ticketLabel} onChange={e => update('ticketLabel', e.target.value)} /><p className="text-xs text-muted-foreground mt-1">Esse nome aparecerá para os convidados</p></div>
            <div><Label>Valor - {form.ticketLabel || 'Ingresso'} (R$)</Label><Input type="number" step="0.01" value={form.ticketPrice} onChange={e => update('ticketPrice', Number(e.target.value))} /></div>
            <div><Label>Chave PIX</Label><Input value={form.pixKey} onChange={e => update('pixKey', e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" /><p className="text-xs text-muted-foreground mt-1">Será utilizada no botão "Pagar agora" da página pública</p></div>
          </div>
        )}
      </div>

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
