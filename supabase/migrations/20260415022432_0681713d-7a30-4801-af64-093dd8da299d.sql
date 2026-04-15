
ALTER TABLE public.events ADD COLUMN slug text UNIQUE;

CREATE UNIQUE INDEX idx_events_slug ON public.events (slug) WHERE slug IS NOT NULL;
