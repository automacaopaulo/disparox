-- Habilitar RLS em todas as novas tabelas
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- Policies públicas para permitir acesso (você pode customizar depois)
CREATE POLICY "Allow public access to flows" ON flows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to flow_executions" ON flow_executions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to tags" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to contact_tags" ON contact_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to audiences" ON audiences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to chatbot_config" ON chatbot_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to chatbot_conversations" ON chatbot_conversations FOR ALL USING (true) WITH CHECK (true);