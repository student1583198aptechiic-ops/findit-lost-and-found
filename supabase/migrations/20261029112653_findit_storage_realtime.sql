/*
# FindIt — Storage bucket + policies + realtime

1. Storage
- Creates a public bucket 'item-images' for user-uploaded item photos.
- Policies: authenticated upload/update/delete, anyone read (public bucket).
- Also creates an 'avatars' public bucket for profile photos.

2. Realtime
- Adds messages, notifications, conversations to the realtime publication via a DO block.
*/

INSERT INTO storage.buckets (id, name, public) VALUES
  ('item-images', 'item-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "item_images_read" ON storage.objects;
CREATE POLICY "item_images_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'item-images');
DROP POLICY IF EXISTS "item_images_upload" ON storage.objects;
CREATE POLICY "item_images_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'item-images');
DROP POLICY IF EXISTS "item_images_update" ON storage.objects;
CREATE POLICY "item_images_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'item-images') WITH CHECK (bucket_id = 'item-images');
DROP POLICY IF EXISTS "item_images_delete" ON storage.objects;
CREATE POLICY "item_images_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'item-images');

DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
CREATE POLICY "avatars_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['messages','notifications','conversations'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END
$$;
