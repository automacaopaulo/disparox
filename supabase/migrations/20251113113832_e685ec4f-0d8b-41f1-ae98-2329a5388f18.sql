-- Simplificar RLS policies para uso single-user
-- Remover restrições de admin e permitir acesso a usuários autenticados

-- WhatsApp Numbers
DROP POLICY IF EXISTS "Admins can view whatsapp numbers" ON whatsapp_numbers;
DROP POLICY IF EXISTS "Admins can manage whatsapp numbers" ON whatsapp_numbers;

CREATE POLICY "Authenticated users can view whatsapp numbers"
ON whatsapp_numbers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage whatsapp numbers"
ON whatsapp_numbers FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Templates
DROP POLICY IF EXISTS "Admins can manage templates" ON templates;

CREATE POLICY "Authenticated users can manage templates"
ON templates FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- App Config
DROP POLICY IF EXISTS "Admins can view app config" ON app_config;
DROP POLICY IF EXISTS "Admins can manage app config" ON app_config;

CREATE POLICY "Authenticated users can view app config"
ON app_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage app config"
ON app_config FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Chatbot Config
DROP POLICY IF EXISTS "Admins can view chatbot config" ON chatbot_config;
DROP POLICY IF EXISTS "Admins can manage chatbot config" ON chatbot_config;

CREATE POLICY "Authenticated users can view chatbot config"
ON chatbot_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage chatbot config"
ON chatbot_config FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Webhook Events
DROP POLICY IF EXISTS "Admins can view webhook events" ON webhook_events;

CREATE POLICY "Authenticated users can view webhook events"
ON webhook_events FOR SELECT
TO authenticated
USING (true);

-- Logs
DROP POLICY IF EXISTS "Admins can view logs" ON logs;

CREATE POLICY "Authenticated users can view logs"
ON logs FOR SELECT
TO authenticated
USING (true);

-- User Roles (manter políticas existentes mas adicionar uma para visualização)
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

CREATE POLICY "Authenticated users can view all roles"
ON user_roles FOR SELECT
TO authenticated
USING (true);

-- Campanhas - ajustar política de update
DROP POLICY IF EXISTS "Users can update their campaigns" ON campaigns;

CREATE POLICY "Authenticated users can update campaigns"
ON campaigns FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete campaigns" ON campaigns;

CREATE POLICY "Authenticated users can delete campaigns"
ON campaigns FOR DELETE
TO authenticated
USING (true);

-- Contacts - ajustar política de delete
DROP POLICY IF EXISTS "Admins can delete contacts" ON contacts;

CREATE POLICY "Authenticated users can delete contacts"
ON contacts FOR DELETE
TO authenticated
USING (true);