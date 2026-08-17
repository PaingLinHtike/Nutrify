-- ============================================================
-- Fix: user_profiles RLS + auto-create profile on signup
-- Root cause: with email confirmation enabled, supabase.auth.signUp()
-- returns NO session, so client-side INSERTs run as anon with
-- auth.uid() = NULL and are rejected by RLS
--   WITH CHECK (auth.uid() = id).
-- Fix: create the profile server-side via an AFTER INSERT trigger
-- on auth.users (runs as table owner, bypasses RLS), plus ensure
-- the self-ownership policy and API-role grants exist.
-- ============================================================

-- 1. Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Ensure the API roles can use the table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- 3. Recreate the self-ownership policy idempotently
DROP POLICY IF EXISTS "Users own their profile" ON public.user_profiles;
CREATE POLICY "Users own their profile"
    ON public.user_profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4. Auto-create a profile row whenever a new auth user is created
CREATE OR REPLACE FUNCTION public.nutrify_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.nutrify_handle_new_user();
