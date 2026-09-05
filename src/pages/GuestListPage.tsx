import { useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { Guest, PRESENCE_LABELS, PAYMENT_LABELS, PRESENCE_COLORS, PAYMENT_COLORS, PresenceStatus, PaymentStatus, PaymentMethod, PAYMENT_METHOD_LABELS } from '@/types/event';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Download, Edit2, Trash2, CheckCircle, DollarSign, UserCheck, ShieldCheck, Ticket, Link2 } from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function GuestListPage() {
  const { event, addGuest, updateGuest, removeGuest, addPayment } = useEvent();
  const [search, setSearch] = useState('');
  const [presenceFilter, setPresenceFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPayment, setShowPayment] = useState<Guest | null>(null);

  const filtered = event.guests.filter(g => {
    const name = `${g.firstName} ${g.lastName}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (presenceFilter !== 'all' && g.presenceStatus !== presenceFilter) return false;
    if (paymentFilter !== 'all' && g.paymentStatus !== paymentFilter) return false;
    return true;
  });

  const handleExport = () => {
    const headers = ['Nome', 'Sobrenome', 'Telefone', 'Quem Convidou', 'Presença', 'Pagamento', 'Valor Devido', 'Valor Pago', 'Acompanhantes', 'Observações', 'Confirmado em'];
    const rows = event.guests.map(g => [
      g.firstName, g.lastName, g.phone || '', g.invitedBy || '', PRESENCE_LABELS[g.presenceStatus],
      PAYMENT_LABELS[g.paymentStatus], g.amountDue, g.amountPaid, g.companions,
      g.notes, g.confirmedAt || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'convidados.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Lista exportada!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Convidados</h1>
          <p className="text-muted-foreground">{event.guests.length} convidados cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" />Exportar</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={presenceFilter} onValueChange={setPresenceFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Presença" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas presenças</SelectItem>
            {Object.entries(PRESENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Pagamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos pagamentos</SelectItem>
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 font-medium text-muted-foreground">Nome</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Telefone</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Convidou</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Presença</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Pagamento</th>
              <th className="text-right p-4 font-medium text-muted-foreground hidden lg:table-cell">Valor</th>
              <th className="text-center p-4 font-medium text-muted-foreground hidden lg:table-cell">Acomp.</th>
              <th className="text-right p-4 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum convidado encontrado.</td></tr>
            ) : filtered.map(g => (
              <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  <p className="font-medium">{g.firstName} {g.lastName}</p>
                  {g.notes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{g.notes}</p>}
                </td>
                <td className="p-4 hidden md:table-cell text-muted-foreground">{g.phone || '—'}</td>
                <td className="p-4 hidden lg:table-cell text-muted-foreground">{g.invitedBy || '—'}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${PRESENCE_COLORS[g.presenceStatus]}`}>
                    {PRESENCE_LABELS[g.presenceStatus]}
                  </span>
                </td>
                <td className="p-4 hidden sm:table-cell">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${PAYMENT_COLORS[g.paymentStatus]}`}>
                    {PAYMENT_LABELS[g.paymentStatus]}
                  </span>
                </td>
                <td className="p-4 text-right hidden lg:table-cell">
                  <span className="text-foreground">{formatCurrency(g.amountPaid)}</span>
                  {g.amountDue > 0 && <span className="text-muted-foreground text-xs"> / {formatCurrency(g.amountDue)}</span>}
                </td>
                <td className="p-4 text-center hidden lg:table-cell">{g.companions}</td>
                <td className="p-4">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      updateGuest(g.id, { presenceStatus: 'confirmed', confirmedAt: new Date().toISOString() });
                      toast.success('Confirmado!');
                    }} title="Confirmar"><CheckCircle className="w-4 h-4 text-success" /></Button>
                    {event.isPaid && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPayment(g)} title="Pagamento">
                        <DollarSign className="w-4 h-4 text-warning" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      updateGuest(g.id, { checkedIn: true, checkedInAt: new Date().toISOString(), presenceStatus: 'attended' });
                      toast.success('Check-in realizado!');
                    }} title="Check-in"><UserCheck className="w-4 h-4 text-info" /></Button>
                    {event.useTickets && (g.presenceStatus === 'confirmed' || g.presenceStatus === 'attended') && (!event.isPaid || g.paymentStatus === 'paid') && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          window.open(`/ticket/${g.id}`, '_blank');
                        }} title="Ver ingresso"><Ticket className="w-4 h-4 text-primary" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          const url = `${window.location.origin}/ticket/${g.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success('Link do ingresso copiado!');
                        }} title="Copiar link do ingresso"><Link2 className="w-4 h-4 text-primary" /></Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditGuest(g)} title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      removeGuest(g.id);
                      toast.success('Convidado removido.');
                    }} title="Remover"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Guest Dialog */}
      <GuestFormDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={(data) => {
          addGuest({
            ...data,
            presenceStatus: 'pending',
            paymentStatus: event.isPaid ? 'pending' : 'not_applicable',
            amountDue: event.isPaid ? event.ticketPrice * (1 + data.companions) : 0,
            amountPaid: 0,
            checkedIn: false,
          });
          setShowAdd(false);
          toast.success('Convidado adicionado!');
        }}
        isPaid={event.isPaid}
        ticketPrice={event.ticketPrice}
        allowCompanions={event.allowCompanions}
        maxCompanions={event.maxCompanions}
      />

      {/* Edit Guest Dialog */}
      {editGuest && (
        <GuestFormDialog
          open={!!editGuest}
          onClose={() => setEditGuest(null)}
          initial={editGuest}
          onSave={(data) => {
            updateGuest(editGuest.id, data);
            setEditGuest(null);
            toast.success('Convidado atualizado!');
          }}
          isPaid={event.isPaid}
          ticketPrice={event.ticketPrice}
          allowCompanions={event.allowCompanions}
          maxCompanions={event.maxCompanions}
        />
      )}

      {/* Manual Payment Dialog */}
      {showPayment && (
        <ManualPaymentDialog
          guest={showPayment}
          open={!!showPayment}
          onClose={() => setShowPayment(null)}
          onSave={(amount, method, notes) => {
            const newPaid = showPayment.amountPaid + amount;
            const status = newPaid >= showPayment.amountDue ? 'paid' : 'partial';
            updateGuest(showPayment.id, {
              amountPaid: newPaid,
              paymentStatus: status as any,
              paidAt: new Date().toISOString(),
              paymentMethod: method,
            });
            addPayment({
              guestId: showPayment.id,
              amount,
              method,
              date: new Date().toISOString(),
              notes,
              isManual: true,
            });
            setShowPayment(null);
            toast.success('Pagamento registrado!');
          }}
        />
      )}
    </div>
  );
}

function GuestFormDialog({ open, onClose, onSave, initial, isPaid, ticketPrice, allowCompanions, maxCompanions }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initial?: Guest;
  isPaid: boolean;
  ticketPrice: number;
  allowCompanions: boolean;
  maxCompanions: number;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName || '');
  const [lastName, setLastName] = useState(initial?.lastName || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [companions, setCompanions] = useState(initial?.companions || 0);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [invitedBy, setInvitedBy] = useState(initial?.invitedBy || '');
  const [presenceStatus, setPresenceStatus] = useState(initial?.presenceStatus || 'pending');
  const [paymentStatus, setPaymentStatus] = useState(initial?.paymentStatus || (isPaid ? 'pending' : 'not_applicable'));

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Nome e sobrenome são obrigatórios.');
      return;
    }
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone,
      companions,
      notes,
      invitedBy: invitedBy.trim(),
      presenceStatus,
      paymentStatus,
      amountDue: isPaid ? ticketPrice * (1 + companions) : (initial?.amountDue || 0),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{initial ? 'Editar Convidado' : 'Novo Convidado'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
            <div><Label>Sobrenome *</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} /></div>
          </div>
          <div><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div><Label>Quem Convidou</Label><Input value={invitedBy} onChange={e => setInvitedBy(e.target.value)} placeholder="Nome de quem convidou" /></div>
          {initial && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Presença</Label>
                <Select value={presenceStatus} onValueChange={v => setPresenceStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRESENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pagamento</Label>
                <Select value={paymentStatus} onValueChange={v => setPaymentStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {allowCompanions && (
            <div>
              <Label>Acompanhantes (máx: {maxCompanions})</Label>
              <Input type="number" min={0} max={maxCompanions} value={companions} onChange={e => setCompanions(Math.min(Number(e.target.value), maxCompanions))} />
            </div>
          )}
          <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>{initial ? 'Salvar' : 'Adicionar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualPaymentDialog({ guest, open, onClose, onSave }: {
  guest: Guest;
  open: boolean;
  onClose: () => void;
  onSave: (amount: number, method: PaymentMethod, notes: string) => void;
}) {
  const [amount, setAmount] = useState(guest.amountDue - guest.amountPaid);
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [notes, setNotes] = useState('');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Registrar Pagamento</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{guest.firstName} {guest.lastName} — Pendente: {formatCurrency(guest.amountDue - guest.amountPaid)}</p>
        <div className="space-y-4">
          <div><Label>Valor *</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} /></div>
          <div>
            <Label>Método *</Label>
            <Select value={method} onValueChange={v => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Observação</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (amount <= 0) { toast.error('Valor inválido'); return; }
            onSave(amount, method, notes);
          }}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
