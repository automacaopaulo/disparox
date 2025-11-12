-- Criar tabela de templates
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt_BR',
  status TEXT NOT NULL DEFAULT 'APPROVED',
  structure JSONB NOT NULL DEFAULT '{}',
  mappings JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to templates"
ON public.templates
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at em templates
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar colunas em campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS csv_file_url TEXT,
ADD COLUMN IF NOT EXISTS processing_rate INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS error_summary JSONB DEFAULT '{}';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_campaign_items_campaign_status ON public.campaign_items(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_items_status ON public.campaign_items(status);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_status ON public.messages(whatsapp_number_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_msisdn ON public.messages(msisdn, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status, whatsapp_number_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_whatsapp ON public.campaigns(whatsapp_number_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_whatsapp ON public.templates(whatsapp_number_id, is_active);

-- Habilitar realtime apenas para templates (campaigns já está)
ALTER PUBLICATION supabase_realtime ADD TABLE public.templates;