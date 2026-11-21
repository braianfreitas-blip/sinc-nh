-- SINC (Event Flow): traz tudo do INH Eventos. Rodar UMA vez no SQL editor do Lovable Cloud.
-- Partes:
--   1) vários dias, programação, contribuição voluntária
--   2) segurança: só administradores (e-mails convidados) veem dados; a página pública usa funções seguras
--   3) inscrição em grupo, Pix automático e cortesias

-- ===== 1) Vários dias + contribuição voluntária =====
-- INH Eventos: eventos de vários dias + contribuição voluntária.
-- Só adiciona colunas com valores padrão: eventos e convidados existentes
-- continuam funcionando exatamente como antes.

-- Dias do evento: lista de { date: 'AAAA-MM-DD', start: 'HH:MM', end: 'HH:MM' }.
-- Vazia = evento de um dia só (usa as colunas date/time de sempre).
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS days jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Forma de cobrança do evento pago:
--   'fixed'     = valor fixo (comportamento atual)
--   'voluntary' = contribuição voluntária, a pessoa escolhe o valor (ou não contribui)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS contribution_mode text NOT NULL DEFAULT 'fixed';

-- Valores sugeridos na contribuição voluntária, ex.: [20, 50, 100].
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS suggested_amounts jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Texto explicando a contribuição (opcional; se vazio o app usa um texto padrão).
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS contribution_message text;

-- Check-in por dia: { 'AAAA-MM-DD': '<data/hora do check-in>' }.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS checkin_days jsonb NOT NULL DEFAULT '{}'::jsonb;


-- ===== 2) Segurança =====
-- Antes de trancar: quem já tem conta continua administrador
-- (hoje toda conta logada enxerga tudo; isso mantém exatamente as mesmas pessoas).
INSERT INTO public.allowed_emails (email)
SELECT lower(u.email) FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.allowed_emails
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.is_email_allowed(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.allowed_emails WHERE lower(email) = lower(trim(_email)))
$$;
GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can check if email is allowed" ON public.allowed_emails;
DROP POLICY IF EXISTS "Authenticated users can view allowed emails" ON public.allowed_emails;
DROP POLICY IF EXISTS "Authenticated users can insert allowed emails" ON public.allowed_emails;
DROP POLICY IF EXISTS "Authenticated users can delete allowed emails" ON public.allowed_emails;
REVOKE ALL ON public.allowed_emails FROM anon;
CREATE POLICY "Admins can view allowed emails" ON public.allowed_emails FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert allowed emails" ON public.allowed_emails FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete allowed emails" ON public.allowed_emails FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Anon can view events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can select events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can update events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can delete events" ON public.events;
REVOKE ALL ON public.events FROM anon;
CREATE POLICY "Admins can select events" ON public.events FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Anon can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Anon can update guests" ON public.guests;
DROP POLICY IF EXISTS "Anon can view guests" ON public.guests;
DROP POLICY IF EXISTS "Authenticated users can select guests" ON public.guests;
DROP POLICY IF EXISTS "Authenticated users can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Authenticated users can update guests" ON public.guests;
DROP POLICY IF EXISTS "Authenticated users can delete guests" ON public.guests;
REVOKE ALL ON public.guests FROM anon;
CREATE POLICY "Admins can select guests" ON public.guests FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert guests" ON public.guests FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update guests" ON public.guests FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete guests" ON public.guests FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can select payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.payments;
CREATE POLICY "Admins can select payments" ON public.payments FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update payments" ON public.payments FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete payments" ON public.payments FOR DELETE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.get_public_event(_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(e) FROM public.events e
  WHERE e.id::text = _key OR e.slug = _key
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_public_event(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_guests(_event_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id, 'event_id', g.event_id, 'first_name', g.first_name, 'last_name', g.last_name,
    'presence_status', g.presence_status, 'payment_status', g.payment_status,
    'amount_due', g.amount_due, 'amount_paid', g.amount_paid, 'companions', g.companions,
    'notes', CASE WHEN g.notes LIKE 'nao-inscrito%' THEN g.notes ELSE '' END,
    'confirmed_at', g.confirmed_at, 'checked_in', g.checked_in, 'checkin_days', g.checkin_days,
    'created_at', g.created_at
  ) ORDER BY g.created_at), '[]'::jsonb)
  FROM public.guests g WHERE g.event_id = _event_id
$$;
GRANT EXECUTE ON FUNCTION public.get_public_guests(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_ticket(_guest_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'guest', jsonb_build_object('id', g.id, 'event_id', g.event_id, 'first_name', g.first_name,
      'last_name', g.last_name, 'email', g.email, 'companions', g.companions,
      'presence_status', g.presence_status, 'payment_status', g.payment_status, 'checked_in', g.checked_in),
    'event', to_jsonb(e))
  FROM public.guests g JOIN public.events e ON e.id = g.event_id
  WHERE g.id = _guest_id
$$;
GRANT EXECUTE ON FUNCTION public.get_public_ticket(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_add_guest(_id uuid, _event_id uuid, _first text, _last text,
  _phone text, _email text, _companions integer, _invited_by text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.events; taken integer; comp integer; st text; pay text; due numeric; r public.guests;
BEGIN
  SELECT * INTO e FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'event not found'; END IF;
  IF length(trim(coalesce(_first,''))) = 0 OR length(_first) > 100 OR length(coalesce(_last,'')) > 100
     OR length(coalesce(_phone,'')) > 40 OR length(coalesce(_email,'')) > 255 OR length(coalesce(_invited_by,'')) > 200 THEN
    RAISE EXCEPTION 'invalid input';
  END IF;
  comp := CASE WHEN e.allow_companions THEN greatest(0, least(coalesce(_companions,0), e.max_companions)) ELSE 0 END;
  SELECT coalesce(sum(1 + companions),0) INTO taken FROM public.guests
    WHERE event_id = _event_id AND presence_status <> 'cancelled' AND notes NOT LIKE 'nao-inscrito%';
  st := CASE WHEN taken >= e.max_guests THEN 'waitlist' ELSE 'confirmed' END;
  pay := CASE WHEN e.is_paid AND e.contribution_mode = 'voluntary' THEN 'not_applicable'
              WHEN e.is_paid THEN 'pending' ELSE 'exempt' END;
  due := CASE WHEN e.is_paid AND e.contribution_mode <> 'voluntary' THEN e.ticket_price * (1 + comp) ELSE 0 END;
  INSERT INTO public.guests (id, event_id, first_name, last_name, phone, email, presence_status, payment_status,
    amount_due, amount_paid, companions, notes, invited_by, checked_in, confirmed_at)
  VALUES (coalesce(_id, gen_random_uuid()), _event_id, trim(_first), trim(coalesce(_last,'')), nullif(trim(coalesce(_phone,'')),''),
    nullif(lower(trim(coalesce(_email,''))),''), st, pay, due, 0, comp, '', nullif(trim(coalesce(_invited_by,'')),''), false, now())
  RETURNING * INTO r;
  RETURN jsonb_build_object('id', r.id, 'presence_status', r.presence_status, 'payment_status', r.payment_status,
    'amount_due', r.amount_due, 'companions', r.companions);
END $$;
GRANT EXECUTE ON FUNCTION public.public_add_guest(uuid, uuid, text, text, text, text, integer, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_update_guest(_guest_id uuid, _action text, _companions integer DEFAULT NULL,
  _phone text DEFAULT NULL, _email text DEFAULT NULL, _invited_by text DEFAULT NULL, _amount numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.guests; e public.events; taken integer; comp integer; r public.guests;
BEGIN
  SELECT * INTO g FROM public.guests WHERE id = _guest_id;
  IF NOT FOUND OR g.notes LIKE 'nao-inscrito%' THEN RAISE EXCEPTION 'guest not found'; END IF;
  SELECT * INTO e FROM public.events WHERE id = g.event_id;
  IF _action = 'cancel' THEN
    IF e.cancellation_deadline IS NOT NULL AND e.cancellation_deadline <> ''
       AND now() > (e.cancellation_deadline || ' 23:59:59')::timestamp THEN
      RAISE EXCEPTION 'deadline passed';
    END IF;
    UPDATE public.guests SET presence_status = 'cancelled' WHERE id = g.id RETURNING * INTO r;
  ELSIF _action = 'confirm' THEN
    IF length(coalesce(_phone,'')) > 40 OR length(coalesce(_email,'')) > 255 OR length(coalesce(_invited_by,'')) > 200 THEN
      RAISE EXCEPTION 'invalid input';
    END IF;
    comp := CASE WHEN e.allow_companions THEN greatest(0, least(coalesce(_companions,0), e.max_companions)) ELSE 0 END;
    SELECT coalesce(sum(1 + companions),0) INTO taken FROM public.guests
      WHERE event_id = g.event_id AND id <> g.id AND presence_status <> 'cancelled' AND notes NOT LIKE 'nao-inscrito%';
    UPDATE public.guests SET
      presence_status = CASE WHEN g.presence_status = 'attended' THEN 'attended' WHEN taken >= e.max_guests THEN 'waitlist' ELSE 'confirmed' END,
      confirmed_at = now(),
      companions = comp,
      amount_due = CASE WHEN e.is_paid AND e.contribution_mode <> 'voluntary' THEN e.ticket_price * (1 + comp) ELSE g.amount_due END,
      payment_status = CASE WHEN e.is_paid AND e.contribution_mode = 'voluntary' AND g.payment_status = 'pending' THEN 'not_applicable' ELSE g.payment_status END,
      invited_by = coalesce(nullif(trim(coalesce(_invited_by,'')),''), g.invited_by),
      phone = coalesce(nullif(trim(coalesce(_phone,'')),''), g.phone),
      email = coalesce(nullif(lower(trim(coalesce(_email,''))),''), g.email)
    WHERE id = g.id RETURNING * INTO r;
  ELSIF _action = 'pledge' THEN
    IF NOT (e.is_paid AND e.contribution_mode = 'voluntary') OR _amount IS NULL OR _amount <= 0 OR _amount > 100000
       OR g.payment_status IN ('paid','refunded') THEN
      RAISE EXCEPTION 'invalid contribution';
    END IF;
    UPDATE public.guests SET payment_status = 'pledged', amount_due = round(_amount, 2) WHERE id = g.id RETURNING * INTO r;
  ELSE
    RAISE EXCEPTION 'invalid action';
  END IF;
  RETURN jsonb_build_object('id', r.id, 'presence_status', r.presence_status, 'payment_status', r.payment_status,
    'amount_due', r.amount_due, 'companions', r.companions);
END $$;
GRANT EXECUTE ON FUNCTION public.public_update_guest(uuid, text, integer, text, text, text, numeric) TO anon, authenticated;

DROP POLICY IF EXISTS "Authenticated users can upload event assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update event assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete event assets" ON storage.objects;
CREATE POLICY "Admins can upload event assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-assets' AND public.is_admin() AND owner_id = (select auth.uid()::text));
CREATE POLICY "Admins can update own event assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-assets' AND public.is_admin() AND owner_id = (select auth.uid()::text))
  WITH CHECK (bucket_id = 'event-assets' AND public.is_admin() AND owner_id = (select auth.uid()::text));
CREATE POLICY "Admins can delete own event assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-assets' AND public.is_admin() AND owner_id = (select auth.uid()::text));

-- ===== 3) Inscrição em grupo, Pix automático e cortesias =====
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'manual';
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS group_id uuid;
CREATE INDEX IF NOT EXISTS guests_group_id_idx ON public.guests (group_id);

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  group_id uuid NOT NULL,
  guest_ids uuid[] NOT NULL DEFAULT '{}',
  provider text NOT NULL,
  provider_payment_id text,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  pix_qr_code text,
  pix_qr_code_base64 text,
  ticket_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_orders_group_idx ON public.payment_orders (group_id);
CREATE INDEX IF NOT EXISTS payment_orders_provider_payment_idx ON public.payment_orders (provider, provider_payment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payment orders" ON public.payment_orders
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.courtesy_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code text NOT NULL,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courtesy_codes TO authenticated;
GRANT ALL ON public.courtesy_codes TO service_role;
ALTER TABLE public.courtesy_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage courtesy codes" ON public.courtesy_codes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.redeem_courtesy_code(p_event_id uuid, p_code text, p_people integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_left integer; v_take integer;
BEGIN
  SELECT id, max_uses - used_count INTO v_id, v_left FROM public.courtesy_codes
  WHERE event_id = p_event_id AND upper(code) = upper(trim(p_code)) AND active FOR UPDATE;
  IF v_id IS NULL OR v_left <= 0 THEN RETURN 0; END IF;
  v_take := LEAST(v_left, GREATEST(p_people, 0));
  UPDATE public.courtesy_codes SET used_count = used_count + v_take WHERE id = v_id;
  RETURN v_take;
END; $$;
REVOKE ALL ON FUNCTION public.redeem_courtesy_code(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_courtesy_code(uuid, text, integer) TO service_role;
