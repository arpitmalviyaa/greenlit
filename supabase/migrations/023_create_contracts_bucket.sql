-- Create the contracts storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload their own files
CREATE POLICY "Users can upload their own contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: authenticated users can read their own files
CREATE POLICY "Users can read their own contracts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: authenticated users can delete their own files
CREATE POLICY "Users can delete their own contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
