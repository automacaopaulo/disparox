-- Create whatsapp_numbers table for managing multiple WhatsApp Business accounts
CREATE TABLE public.whatsapp_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number_id TEXT NOT NULL UNIQUE,
  waba_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  business_account_id TEXT,
  phone_number TEXT,
  display_name TEXT,
  quality_rating TEXT DEFAULT 'GREEN',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;

-- Allow public access (since no auth yet)
CREATE POLICY "Allow public access to whatsapp_numbers" 
ON public.whatsapp_numbers 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_whatsapp_numbers_phone_id ON public.whatsapp_numbers(phone_number_id);
CREATE INDEX idx_whatsapp_numbers_active ON public.whatsapp_numbers(is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_numbers_updated_at
  BEFORE UPDATE ON public.whatsapp_numbers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id);

-- Add foreign key to messages
ALTER TABLE public.messages 
ADD COLUMN whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_numbers;