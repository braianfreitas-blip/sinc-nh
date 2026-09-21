-- Habilita Realtime na tabela guests: transmite INSERT/UPDATE/DELETE
-- aos clientes inscritos no canal `guests-<event_id>`.
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;

-- Garante que payloads de UPDATE/DELETE incluam a linha completa
-- (necessário para resolver a remoção pelo id no cliente).
ALTER TABLE public.guests REPLICA IDENTITY FULL;
