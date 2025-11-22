-- Drop existing RLS policies for whatsapp_numbers
DROP POLICY IF EXISTS "Authenticated users can view whatsapp numbers" ON public.whatsapp_numbers;
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp numbers" ON public.whatsapp_numbers;

-- Create new public access policies
CREATE POLICY "Public can view whatsapp numbers" 
ON public.whatsapp_numbers 
FOR SELECT 
USING (true);

CREATE POLICY "Public can insert whatsapp numbers" 
ON public.whatsapp_numbers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can update whatsapp numbers" 
ON public.whatsapp_numbers 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete whatsapp numbers" 
ON public.whatsapp_numbers 
FOR DELETE 
USING (true);