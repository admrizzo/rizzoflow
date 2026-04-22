-- Add new values to the guarantee_type enum
ALTER TYPE public.guarantee_type ADD VALUE IF NOT EXISTS 'sg_cred';
ALTER TYPE public.guarantee_type ADD VALUE IF NOT EXISTS 'ucred';
ALTER TYPE public.guarantee_type ADD VALUE IF NOT EXISTS 'sem_garantia';