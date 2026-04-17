-- Add visual identity fields to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS header_bg_color text;

-- Create public storage bucket for event branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-assets', 'event-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for event assets
CREATE POLICY "Event assets are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-assets');

-- Authenticated users (admins) can manage event assets
CREATE POLICY "Authenticated users can upload event assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-assets');

CREATE POLICY "Authenticated users can update event assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'event-assets');

CREATE POLICY "Authenticated users can delete event assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'event-assets');