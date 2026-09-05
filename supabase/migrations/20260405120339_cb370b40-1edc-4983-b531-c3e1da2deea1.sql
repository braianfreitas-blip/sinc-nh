
CREATE TABLE public.allowed_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view allowed emails"
ON public.allowed_emails
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert allowed emails"
ON public.allowed_emails
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete allowed emails"
ON public.allowed_emails
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Anyone can check if email is allowed"
ON public.allowed_emails
FOR SELECT
TO anon
USING (true);
