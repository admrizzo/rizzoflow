-- Add captador columns to public.properties if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'captador_robust_id') THEN
        ALTER TABLE public.properties ADD COLUMN captador_robust_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'captador_nome') THEN
        ALTER TABLE public.properties ADD COLUMN captador_nome TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'captador_email') THEN
        ALTER TABLE public.properties ADD COLUMN captador_email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'captador_phone') THEN
        ALTER TABLE public.properties ADD COLUMN captador_phone TEXT;
    END IF;
END $$;