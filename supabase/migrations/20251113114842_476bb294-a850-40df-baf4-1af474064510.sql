-- Criar bucket para upload de CSVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-csvs', 'campaign-csvs', false)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas para o bucket
CREATE POLICY "Authenticated users can upload CSV files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaign-csvs');

CREATE POLICY "Authenticated users can read their CSV files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'campaign-csvs');

CREATE POLICY "Authenticated users can delete their CSV files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'campaign-csvs');