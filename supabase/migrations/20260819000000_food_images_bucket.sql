-- ============================================================
-- Nutrify - food-images Storage Bucket + policies + indexes
-- ============================================================

-- Create the food-images bucket (public so uploaded images render directly)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'food-images',
    'food-images',
    true,
    52428800,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users may upload to their own folder
DROP POLICY IF EXISTS "Users can upload own food images" ON storage.objects;
CREATE POLICY "Users can upload own food images"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'food-images'
        AND (storage.foldername(name))[1] = 'uploads'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

-- Storage RLS: authenticated users may read their own uploads
DROP POLICY IF EXISTS "Users can read own food images" ON storage.objects;
CREATE POLICY "Users can read own food images"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'food-images'
        AND (storage.foldername(name))[1] = 'uploads'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

-- Storage RLS: authenticated users may delete their own uploads
DROP POLICY IF EXISTS "Users can delete own food images" ON storage.objects;
CREATE POLICY "Users can delete own food images"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'food-images'
        AND (storage.foldername(name))[1] = 'uploads'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

-- Public read for the bucket contents (public = true)
DROP POLICY IF EXISTS "Public can read food images" ON storage.objects;
CREATE POLICY "Public can read food images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'food-images');

-- Query-performance indexes for meals -> image lookups
CREATE INDEX IF NOT EXISTS idx_meals_image_id ON meals(image_id);
