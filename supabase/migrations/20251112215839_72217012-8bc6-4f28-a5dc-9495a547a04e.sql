-- Tabela de contatos com opt-out
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  msisdn TEXT NOT NULL UNIQUE,
  name TEXT,
  cpf TEXT,
  opt_out BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_contacts_msisdn ON public.contacts(msisdn);
CREATE INDEX idx_contacts_opt_out ON public.contacts(opt_out);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Política: permitir acesso público (app privado interno)
CREATE POLICY "Allow public access to contacts"
ON public.contacts FOR ALL
USING (true)
WITH CHECK (true);

-- Tabela de campanhas
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_name TEXT,
  language TEXT DEFAULT 'pt_BR',
  status TEXT DEFAULT 'pending',
  total_items INTEGER DEFAULT 0,
  sent INTEGER DEFAULT 0,
  delivered INTEGER DEFAULT 0,
  read INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_created_at ON public.campaigns(created_at DESC);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to campaigns"
ON public.campaigns FOR ALL
USING (true)
WITH CHECK (true);

-- Tabela de itens de campanha
CREATE TABLE public.campaign_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  msisdn TEXT NOT NULL,
  params JSONB,
  status TEXT DEFAULT 'pending',
  error_code TEXT,
  error_message TEXT,
  message_id TEXT,
  fbtrace_id TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_campaign_items_campaign_id ON public.campaign_items(campaign_id);
CREATE INDEX idx_campaign_items_status ON public.campaign_items(status);
CREATE INDEX idx_campaign_items_message_id ON public.campaign_items(message_id);

ALTER TABLE public.campaign_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to campaign_items"
ON public.campaign_items FOR ALL
USING (true)
WITH CHECK (true);

-- Tabela de mensagens
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL,
  msisdn TEXT NOT NULL,
  phone_id TEXT,
  template_name TEXT,
  content JSONB,
  status TEXT DEFAULT 'pending',
  error_code TEXT,
  error_message TEXT,
  fbtrace_id TEXT,
  message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_messages_message_id ON public.messages(message_id);
CREATE INDEX idx_messages_msisdn ON public.messages(msisdn);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to messages"
ON public.messages FOR ALL
USING (true)
WITH CHECK (true);

-- Tabela de eventos de webhook
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  message_id TEXT,
  raw JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_webhook_events_message_id ON public.webhook_events(message_id);
CREATE INDEX idx_webhook_events_created_at ON public.webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_processed ON public.webhook_events(processed);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to webhook_events"
ON public.webhook_events FOR ALL
USING (true)
WITH CHECK (true);

-- Tabela de configurações (armazenar credenciais de forma segura)
CREATE TABLE public.app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Apenas admin pode acessar config (por enquanto público para setup inicial)
CREATE POLICY "Allow public access to app_config"
ON public.app_config FOR ALL
USING (true)
WITH CHECK (true);

-- Tabela de logs
CREATE TABLE public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_logs_level ON public.logs(level);
CREATE INDEX idx_logs_created_at ON public.logs(created_at DESC);

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to logs"
ON public.logs FOR ALL
USING (true)
WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_items_updated_at
BEFORE UPDATE ON public.campaign_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para algumas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;