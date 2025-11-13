-- Corrigir política de INSERT em campaigns para single-user
DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON campaigns;

CREATE POLICY "Authenticated users can create campaigns"
ON campaigns FOR INSERT
TO authenticated
WITH CHECK (true);