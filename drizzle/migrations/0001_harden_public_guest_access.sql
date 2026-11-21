REVOKE EXECUTE ON FUNCTION public.get_public_guests(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_occupancy(_event_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(1 + companions),0)::int FROM public.guests
  WHERE event_id = _event_id AND presence_status <> 'cancelled' AND notes NOT LIKE 'nao-inscrito%'
$$;
GRANT EXECUTE ON FUNCTION public.get_public_occupancy(uuid) TO anon, authenticated;

-- Look up one's own registration: requires name AND the phone used at sign-up.
CREATE OR REPLACE FUNCTION public.public_lookup_guest(_event_id uuid, _first text, _last text, _phone text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d text := regexp_replace(coalesce(_phone,''), '\D', '', 'g'); g public.guests;
BEGIN
  IF length(d) < 8 THEN RETURN NULL; END IF;
  SELECT * INTO g FROM public.guests
  WHERE event_id = _event_id AND notes NOT LIKE 'nao-inscrito%'
    AND lower(trim(first_name)) = lower(trim(coalesce(_first,'')))
    AND lower(trim(last_name)) = lower(trim(coalesce(_last,'')))
    AND phone IS NOT NULL
    AND right(regexp_replace(phone, '\D', '', 'g'), 8) = right(d, 8)
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('id', g.id, 'event_id', g.event_id, 'first_name', g.first_name, 'last_name', g.last_name,
    'presence_status', g.presence_status, 'payment_status', g.payment_status, 'amount_due', g.amount_due,
    'amount_paid', g.amount_paid, 'companions', g.companions, 'notes', '', 'confirmed_at', g.confirmed_at,
    'checked_in', g.checked_in, 'checkin_days', '{}'::jsonb, 'created_at', g.created_at);
END $$;
GRANT EXECUTE ON FUNCTION public.public_lookup_guest(uuid, text, text, text) TO anon, authenticated;

-- Ticket: stop returning the guest's email.
CREATE OR REPLACE FUNCTION public.get_public_ticket(_guest_id uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'guest', jsonb_build_object('id', g.id, 'event_id', g.event_id, 'first_name', g.first_name,
      'last_name', g.last_name, 'email', NULL, 'companions', g.companions,
      'presence_status', g.presence_status, 'payment_status', g.payment_status, 'checked_in', g.checked_in),
    'event', to_jsonb(e) - 'pix_key')
  FROM public.guests g JOIN public.events e ON e.id = g.event_id
  WHERE g.id = _guest_id
$function$;

-- Courtesy codes: reject short guessable codes for new entries.
ALTER TABLE public.courtesy_codes ADD CONSTRAINT courtesy_code_min_length CHECK (length(code) >= 10) NOT VALID;