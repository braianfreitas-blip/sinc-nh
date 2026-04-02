import { useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function EventSettingsPage() {
  const { event, updateEvent } = useEvent();
  const [form, setForm] = useState({
    name: event.name,
    date: event.date,
    time: event.time,
    location: event.location,
    description: event.description,
    isPaid: event.isPaid,
    ticketPrice: event.ticketPrice,
    maxGuests: event.maxGuests,
    allowCompanions: event.allowCompanions,
    maxCompanions: event.maxCompanions,
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Nome do evento é obrigatório.'); return; }
    updateEvent(form);
    toast.success('Configurações salvas!');
  };

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações do Evento</h1>
        <p className="text-muted-foreground mt-1">Defina os detalhes do seu evento</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
        <div><Label>Nome do Evento *</Label><Input value={form.name} onChange={e => update('name', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Data</Label><Input type="date" value={form.date} onChange={e => update('date', e.target.value)} /></div>
          <div><Label>Horário</Label><Input type="time" value={form.time} onChange={e => update('time', e.target.value)} /></div>
        </div>
        <div><Label>Local</Label><Input value={form.location} onChange={e => update('location', e.target.value)} /></div>
        <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} /></div>
        <div><Label>Limite de Convidados</Label><Input type="number" value={form.maxGuests} onChange={e => update('maxGuests', Number(e.target.value))} /></div>
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
          <div><Label>Valor do Ingresso (R$)</Label><Input type="number" step="0.01" value={form.ticketPrice} onChange={e => update('ticketPrice', Number(e.target.value))} /></div>
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

      <Button onClick={handleSave} className="w-full sm:w-auto"><Save className="w-4 h-4 mr-2" />Salvar Configurações</Button>
    </div>
  );
}
