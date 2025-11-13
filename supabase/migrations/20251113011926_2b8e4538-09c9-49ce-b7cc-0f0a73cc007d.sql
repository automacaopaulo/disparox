-- Step 1: Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 4: Add user_id columns to tables that need ownership
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.whatsapp_numbers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.flows ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.audiences ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Step 5: Drop all existing public access policies
DROP POLICY IF EXISTS "Allow public access to app_config" ON public.app_config;
DROP POLICY IF EXISTS "Allow public access to audiences" ON public.audiences;
DROP POLICY IF EXISTS "Allow public access to campaign_items" ON public.campaign_items;
DROP POLICY IF EXISTS "Allow public access to campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow public access to chatbot_config" ON public.chatbot_config;
DROP POLICY IF EXISTS "Allow public access to chatbot_conversations" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Allow public access to contact_tags" ON public.contact_tags;
DROP POLICY IF EXISTS "Allow public access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public access to flow_executions" ON public.flow_executions;
DROP POLICY IF EXISTS "Allow public access to flows" ON public.flows;
DROP POLICY IF EXISTS "Allow public access to logs" ON public.logs;
DROP POLICY IF EXISTS "Allow public access to messages" ON public.messages;
DROP POLICY IF EXISTS "Allow public access to tags" ON public.tags;
DROP POLICY IF EXISTS "Allow public access to templates" ON public.templates;
DROP POLICY IF EXISTS "Allow public access to webhook_events" ON public.webhook_events;
DROP POLICY IF EXISTS "Allow public access to whatsapp_numbers" ON public.whatsapp_numbers;

-- Step 6: Create secure RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 7: Create secure RLS policies for contacts (LGPD protected)
CREATE POLICY "Authenticated users can view contacts"
ON public.contacts FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert contacts"
ON public.contacts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update contacts"
ON public.contacts FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete contacts"
ON public.contacts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 8: Secure whatsapp_numbers (CRITICAL - API credentials)
CREATE POLICY "Admins can view whatsapp numbers"
ON public.whatsapp_numbers FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage whatsapp numbers"
ON public.whatsapp_numbers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 9: Secure campaigns
CREATE POLICY "Authenticated users can view campaigns"
ON public.campaigns FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create campaigns"
ON public.campaigns FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their campaigns"
ON public.campaigns FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete campaigns"
ON public.campaigns FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 10: Secure campaign_items
CREATE POLICY "Authenticated users can view campaign items"
ON public.campaign_items FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage campaign items"
ON public.campaign_items FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Step 11: Secure messages
CREATE POLICY "Authenticated users can view messages"
ON public.messages FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update messages"
ON public.messages FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Step 12: Secure templates
CREATE POLICY "Authenticated users can view templates"
ON public.templates FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage templates"
ON public.templates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 13: Secure flows
CREATE POLICY "Authenticated users can view flows"
ON public.flows FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage flows"
ON public.flows FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Step 14: Secure audiences
CREATE POLICY "Authenticated users can view audiences"
ON public.audiences FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage audiences"
ON public.audiences FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Step 15: Secure tags
CREATE POLICY "Authenticated users can view tags"
ON public.tags FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage tags"
ON public.tags FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Step 16: Secure chatbot config
CREATE POLICY "Admins can view chatbot config"
ON public.chatbot_config FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage chatbot config"
ON public.chatbot_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 17: Secure chatbot conversations
CREATE POLICY "Authenticated users can view chatbot conversations"
ON public.chatbot_conversations FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage chatbot conversations"
ON public.chatbot_conversations FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Step 18: Secure contact_tags
CREATE POLICY "Authenticated users can view contact tags"
ON public.contact_tags FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage contact tags"
ON public.contact_tags FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Step 19: Secure flow_executions
CREATE POLICY "Authenticated users can view flow executions"
ON public.flow_executions FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage flow executions"
ON public.flow_executions FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Step 20: Secure logs (admin only)
CREATE POLICY "Admins can view logs"
ON public.logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert logs"
ON public.logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Step 21: Secure webhook_events (system only)
CREATE POLICY "Admins can view webhook events"
ON public.webhook_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage webhook events"
ON public.webhook_events FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Step 22: Secure app_config (admin only)
CREATE POLICY "Admins can view app config"
ON public.app_config FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage app config"
ON public.app_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));