-- Adicionar campos para opt-out e tracking de janela 24h
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS opt_out_reason TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS opt_out_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_message_sent_at TIMESTAMP WITH TIME ZONE;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_contacts_opt_out ON contacts(opt_out) WHERE opt_out = true;
CREATE INDEX IF NOT EXISTS idx_contacts_last_message ON contacts(last_message_sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_items_status ON campaign_items(status);

-- Adicionar campo para tracking de retry
ALTER TABLE campaign_items ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaign_items ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP WITH TIME ZONE;

-- Comentários para documentação
COMMENT ON COLUMN contacts.opt_out IS 'Se o contato optou por não receber mensagens (STOP/PARAR)';
COMMENT ON COLUMN contacts.opt_out_reason IS 'Motivo do opt-out (ex: respondeu STOP)';
COMMENT ON COLUMN contacts.last_message_sent_at IS 'Última vez que enviamos mensagem (para janela 24h)';
COMMENT ON COLUMN campaign_items.next_retry_at IS 'Próxima tentativa de envio (retry com backoff)';