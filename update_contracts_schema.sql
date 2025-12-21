-- Add signed_contract_url column to contract_history
ALTER TABLE contract_history
ADD COLUMN IF NOT EXISTS signed_contract_url text;

-- Create contracts storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the contracts bucket
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'contracts' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'contracts' );

-- Allow authenticated users to update their own uploads (optional, usually not needed for simple upload)
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'contracts' );
