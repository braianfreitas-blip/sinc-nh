ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
ALTER TABLE public.guests REPLICA IDENTITY FULL;