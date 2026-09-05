
-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Meu Evento',
  date TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  ticket_price NUMERIC NOT NULL DEFAULT 0,
  ticket_label TEXT NOT NULL DEFAULT 'Ingresso',
  pix_key TEXT,
  max_guests INTEGER NOT NULL DEFAULT 100,
  allow_companions BOOLEAN NOT NULL DEFAULT false,
  max_companions INTEGER NOT NULL DEFAULT 1,
  cancellation_deadline TEXT,
  header_text_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything with events
CREATE POLICY "Authenticated users can select events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update events" ON public.events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete events" ON public.events FOR DELETE TO authenticated USING (true);

-- Anonymous users can view events (public RSVP page)
CREATE POLICY "Anon can view events" ON public.events FOR SELECT TO anon USING (true);

-- Create guests table
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  presence_status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'not_applicable',
  amount_due NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  companions INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  confirmed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  invited_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select guests" ON public.guests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert guests" ON public.guests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update guests" ON public.guests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete guests" ON public.guests FOR DELETE TO authenticated USING (true);

-- Anon can view guests (public page shows confirmed list)
CREATE POLICY "Anon can view guests" ON public.guests FOR SELECT TO anon USING (true);
-- Anon can insert guests (public RSVP confirmation)
CREATE POLICY "Anon can insert guests" ON public.guests FOR INSERT TO anon WITH CHECK (true);
-- Anon can update guests (public cancellation)
CREATE POLICY "Anon can update guests" ON public.guests FOR UPDATE TO anon USING (true);

CREATE INDEX idx_guests_event_id ON public.guests(event_id);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  is_manual BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update payments" ON public.payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete payments" ON public.payments FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_payments_guest_id ON public.payments(guest_id);

-- Create trigger for updated_at on events
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default event so the app works immediately
INSERT INTO public.events (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Meu Evento');
