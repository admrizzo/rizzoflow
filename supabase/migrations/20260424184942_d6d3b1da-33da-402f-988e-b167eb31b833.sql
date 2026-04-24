ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.email IS NULL OR p.email <> u.email);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx
ON public.profiles (lower(email))
WHERE email IS NOT NULL;