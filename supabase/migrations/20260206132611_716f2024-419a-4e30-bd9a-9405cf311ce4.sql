-- Allow admins to upload avatars for any user
CREATE POLICY "Admins can upload any avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to update any avatar
CREATE POLICY "Admins can update any avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to delete any avatar
CREATE POLICY "Admins can delete any avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
