import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, MapPin, Ticket, ArrowLeft, Users, CheckCircle2, FileImage, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import sincLogo from '@/assets/sinc-logo.png';

interface TicketData {
  guest: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    companions: number;
    presence_status: string;
    payment_status: string;
    checked_in: boolean;
  };
  event: {
    id: string;
    slug: string | null;
    name: string;
    date: string;
    time: string;
    location: string;
    is_paid: boolean;
    ticket_label: string;
    use_tickets: boolean;
    logo_url: string | null;
    header_bg_color: string | null;
    header_text_color: string | null;
    primary_color: string | null;
  };
}

export default function TicketPage() {
  const { guestId } = useParams<{ guestId: string }>();
  const [data, setData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'png' | 'pdf' | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!guestId) return;
    (async () => {
      try {
        const { data: guest, error: gErr } = await supabase
          .from('guests')
          .select('*')
          .eq('id', guestId)
          .single();
        if (gErr || !guest) throw gErr || new Error('Guest not found');

        const { data: event, error: eErr } = await supabase
          .from('events')
          .select('*')
          .eq('id', guest.event_id)
          .single();
        if (eErr || !event) throw eErr || new Error('Event not found');

        if (!event.use_tickets) {
          setError('Este evento não emite ingressos.');
          return;
        }
        if (guest.presence_status === 'cancelled') {
          setError('Esta presença foi cancelada — ingresso indisponível.');
          return;
        }

        setData({ guest, event });
      } catch (err) {
        console.error(err);
        setError('Ingresso não encontrado.');
      } finally {
        setLoading(false);
      }
    })();
  }, [guestId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando ingresso...</div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <Ticket className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">{error || 'Ingresso indisponível.'}</p>
        <Button asChild variant="outline"><Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Link></Button>
      </div>
    );
  }

  const { guest, event } = data;
  const eventPath = event.slug || event.id;
  const qrPayload = JSON.stringify({
    t: 'ticket',
    g: guest.id,
    e: event.id,
    n: `${guest.first_name} ${guest.last_name}`,
  });

  const totalPeople = 1 + (guest.companions || 0);
  const fileBase = `ingresso-${guest.first_name}-${guest.last_name}`.toLowerCase().replace(/\s+/g, '-');
  const accent: React.CSSProperties = event.primary_color ? { color: event.primary_color } : { color: 'hsl(var(--primary))' };

  const captureCanvas = async () => {
    if (!ticketRef.current) return null;
    return await html2canvas(ticketRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
  };

  const handleDownloadPNG = async () => {
    setDownloading('png');
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${fileBase}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Imagem baixada!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar imagem.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading('pdf');
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      // A4 portrait, mm
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const ratio = canvas.width / canvas.height;
      let imgWidth = maxWidth;
      let imgHeight = imgWidth / ratio;
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * ratio;
      }
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`${fileBase}.pdf`);
      toast.success('PDF baixado!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to={`/event/${eventPath}`}><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao evento</Link>
        </Button>

        <div ref={ticketRef} className="bg-card rounded-2xl border border-border shadow-elegant overflow-hidden">
          {/* Header */}
          <div
            className={event.header_bg_color ? 'p-6 text-center' : 'gradient-primary text-primary-foreground p-6 text-center'}
            style={{
              ...(event.header_bg_color ? { background: event.header_bg_color } : {}),
              ...(event.header_text_color ? { color: event.header_text_color } : {}),
            }}
          >
            <img src={event.logo_url || sincLogo} alt={event.name} className="w-14 h-14 rounded-xl object-cover mx-auto mb-3" />
            <p className="text-xs uppercase tracking-wider opacity-80">Ingresso</p>
            <h1 className="font-display text-2xl font-bold mt-1">{event.name}</h1>
          </div>

          {/* Info */}
          <div className="p-6 space-y-4 text-sm">
            <div className="space-y-2 text-muted-foreground">
              {event.date && (
                <p className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" style={accent} />
                  {new Date(event.date + 'T00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
              {event.time && <p className="flex items-center gap-2"><Clock className="w-4 h-4" style={accent} />{event.time}</p>}
              {event.location && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" style={accent} />{event.location}</p>}
            </div>

            <div className="border-t border-dashed border-border pt-4">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">Convidado</p>
              <p className="font-display text-xl font-semibold text-foreground mt-1">
                {guest.first_name} {guest.last_name}
              </p>
              {guest.email && <p className="text-xs text-muted-foreground mt-1">{guest.email}</p>}
              {totalPeople > 1 && (
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                  <Users className="w-4 h-4" />{totalPeople} pessoas (com {guest.companions} acompanhante{guest.companions > 1 ? 's' : ''})
                </p>
              )}
              {guest.checked_in && (
                <p className="text-sm text-success mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />Check-in realizado
                </p>
              )}
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-xl p-6 flex flex-col items-center border border-border">
              <QRCodeSVG value={qrPayload} size={200} level="M" includeMargin={false} />
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Apresente este QR Code na entrada do evento
              </p>
            </div>

            <div className="text-center pt-2">
              <p className="text-[10px] text-muted-foreground/70 font-mono break-all">ID: {guest.id}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleDownloadPNG} disabled={!!downloading} variant="outline" className="flex-1">
            <FileImage className="w-4 h-4 mr-2" />
            {downloading === 'png' ? 'Gerando...' : 'Baixar PNG'}
          </Button>
          <Button onClick={handleDownloadPDF} disabled={!!downloading} variant="outline" className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            {downloading === 'pdf' ? 'Gerando...' : 'Baixar PDF'}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Salve este ingresso ou tire um print para apresentar na entrada
        </p>
      </div>
    </div>
  );
}
