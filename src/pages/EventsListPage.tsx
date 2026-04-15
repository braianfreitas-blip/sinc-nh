import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, CalendarDays, MapPin, Users, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import sincLogo from '@/assets/sinc-logo.png';

interface EventSummary {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  created_at: string;
  guest_count?: number;
}

export default function EventsListPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, date, time, location, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading events:', error);
      return;
    }

    // Get guest counts
    const eventsWithCounts: EventSummary[] = [];
    for (const ev of data || []) {
      const { count } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', ev.id);
      eventsWithCounts.push({ ...ev, guest_count: count || 0 });
    }

    setEvents(eventsWithCounts);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Informe o nome do evento.');
      return;
    }

    const { data, error } = await supabase
      .from('events')
      .insert({
        name: newName.trim(),
        date: newDate,
        location: newLocation.trim(),
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar evento.');
      console.error(error);
      return;
    }

    toast.success('Evento criado!');
    setShowCreate(false);
    setNewName('');
    setNewDate('');
    setNewLocation('');
    navigate(`/admin/events/${data.id}`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"? Todos os convidados e pagamentos serão removidos.`)) return;

    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir evento.');
      return;
    }
    toast.success('Evento excluído.');
    loadEvents();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-sidebar-foreground px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={sincLogo} alt="SINC" className="w-10 h-10 rounded-lg object-cover" />
          <div>
            <h1 className="font-display text-lg font-semibold text-sidebar-primary">SINC</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestão de Eventos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-xs text-sidebar-foreground/60 hidden sm:block">{user.email}</span>}
          <Link to="/admin/invites">
            <Button variant="ghost" size="sm" className="text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <UserPlus className="w-4 h-4 mr-1" />Convites
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Meus Eventos</h2>
            <p className="text-muted-foreground">{events.length} evento(s) cadastrado(s)</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />Novo Evento
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <CalendarDays className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum evento</h3>
            <p className="text-muted-foreground mb-6">Crie seu primeiro evento para começar.</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />Criar Evento
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map(ev => (
              <div
                key={ev.id}
                className="bg-card rounded-xl border border-border shadow-card p-6 hover:shadow-elegant transition-shadow cursor-pointer group relative"
                onClick={() => navigate(`/admin/events/${ev.id}`)}
              >
                <button
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(ev.id, ev.name);
                  }}
                  title="Excluir evento"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
                <h3 className="font-display text-lg font-semibold mb-2">{ev.name}</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {ev.date && (
                    <p className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      {new Date(ev.date + 'T00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  {ev.location && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {ev.location}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {ev.guest_count} convidado(s)
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Novo Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome do Evento *</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Festa de Aniversário" /></div>
            <div><Label>Data</Label><Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} /></div>
            <div><Label>Local</Label><Input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Endereço do evento" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar Evento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
