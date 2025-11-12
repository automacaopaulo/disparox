-- ========================================
-- FLOW BUILDER: Tabelas para automações
-- ========================================

-- Tabela de flows (automações)
CREATE TABLE IF NOT EXISTS flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  whatsapp_number_id UUID REFERENCES whatsapp_numbers(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- 'manual', 'new_contact', 'opt_in', 'keyword'
  trigger_keyword TEXT, -- palavra-chave para iniciar flow
  is_active BOOLEAN DEFAULT true,
  nodes JSONB NOT NULL DEFAULT '[]', -- estrutura do flow (React Flow)
  edges JSONB NOT NULL DEFAULT '[]', -- conexões entre nodes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de execuções de flows
CREATE TABLE IF NOT EXISTS flow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'paused'
  current_node_id TEXT, -- ID do node atual
  context JSONB DEFAULT '{}', -- variáveis do flow
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- ========================================
-- TAGS E SEGMENTAÇÃO
-- ========================================

-- Tabela de tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3B82F6', -- hex color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Relacionamento many-to-many entre contacts e tags
CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(contact_id, tag_id)
);

-- Públicos salvos (segmentações)
CREATE TABLE IF NOT EXISTS audiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}', -- condições de filtro
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- CHATBOT COM IA
-- ========================================

-- Tabela de configurações do chatbot
CREATE TABLE IF NOT EXISTS chatbot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_number_id UUID UNIQUE REFERENCES whatsapp_numbers(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  system_prompt TEXT NOT NULL DEFAULT 'Você é um assistente útil e prestativo.',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  auto_reply_delay_seconds INTEGER DEFAULT 5, -- delay antes de responder
  max_tokens INTEGER DEFAULT 500,
  temperature REAL DEFAULT 0.7,
  business_hours_only BOOLEAN DEFAULT false,
  business_hours_start TIME DEFAULT '09:00',
  business_hours_end TIME DEFAULT '18:00',
  out_of_hours_message TEXT DEFAULT 'Obrigado pela mensagem! Nosso horário de atendimento é das 9h às 18h. Responderemos em breve.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Histórico de conversas do chatbot
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  whatsapp_number_id UUID NOT NULL REFERENCES whatsapp_numbers(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]', -- array de mensagens {role, content, timestamp}
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_flows_whatsapp_number ON flows(whatsapp_number_id);
CREATE INDEX IF NOT EXISTS idx_flows_active ON flows(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_id ON flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_contact_id ON flow_executions(contact_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_status ON flow_executions(status);
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_id ON contact_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_contact ON chatbot_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_active ON chatbot_conversations(is_active) WHERE is_active = true;

-- ========================================
-- TRIGGERS PARA UPDATED_AT
-- ========================================

CREATE TRIGGER update_flows_updated_at
BEFORE UPDATE ON flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audiences_updated_at
BEFORE UPDATE ON audiences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_config_updated_at
BEFORE UPDATE ON chatbot_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- COMENTÁRIOS
-- ========================================

COMMENT ON TABLE flows IS 'Automações de mensagens com Flow Builder';
COMMENT ON TABLE flow_executions IS 'Execuções individuais de flows por contato';
COMMENT ON TABLE tags IS 'Tags para organização de contatos';
COMMENT ON TABLE contact_tags IS 'Relacionamento many-to-many entre contacts e tags';
COMMENT ON TABLE audiences IS 'Públicos salvos com filtros de segmentação';
COMMENT ON TABLE chatbot_config IS 'Configurações do chatbot com IA por número WhatsApp';
COMMENT ON TABLE chatbot_conversations IS 'Histórico de conversas do chatbot';