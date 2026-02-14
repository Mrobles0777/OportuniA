
-- ====================================================================
-- ⚡ GUÍA PARA ELIMINAR ERRORES DE AUTENTICACIÓN (SUPABASE DASHBOARD)
-- ====================================================================

/* 
   ⚠️ ERROR: "Email rate limit exceeded"
   -----------------------------------------
   Este error ocurre cuando haces muchos intentos de registro/login seguidos.
   PARA ELIMINAR ESTE LÍMITE:
   1. Ve a https://supabase.com/dashboard -> Selecciona tu Proyecto.
   2. Menú lateral: "Authentication" -> "Settings" -> "Rate Limits".
   3. Cambia "Max Email Signups per Hour" de 3 a 100.
   4. Cambia "Max Sign In Attempts" de 30 a 500.
   5. Haz clic en "Save".

   ⚠️ ERROR: "Email not confirmed"
   -----------------------------------
   Por defecto, Supabase obliga a verificar el email antes de entrar.
   PARA DESACTIVAR ESTA OBLIGACIÓN (RECOMENDADO PARA PRUEBAS):
   1. Menú lateral: "Authentication" -> "Providers" -> "Email".
   2. BUSCA la casilla: "Confirm email" y DESMÁRCALA.
   3. BUSCA la casilla: "Secure email change" y DESMÁRCALA.
   4. Haz clic en "Save" (abajo a la derecha).
   * Ahora los usuarios podrán entrar inmediatamente tras registrarse.
*/

-- ====================================================================
-- ESTRUCTURA DE BASE DE DATOS NEXTVENTURES IA 2026
-- ====================================================================

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  available_investment NUMERIC DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles are editable by owner" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tabla de negocios guardados
CREATE TABLE IF NOT EXISTS public.saved_opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  initial_investment NUMERIC,
  expected_roi TEXT,
  difficulty TEXT,
  marketing_strategy TEXT,
  reference_url TEXT,
  suppliers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own opportunities" ON public.saved_opportunities FOR ALL USING (auth.uid() = user_id);

-- Función para creación automática de perfil tras registro en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, available_investment, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Inversionista'),
    new.raw_user_meta_data->>'phone',
    (COALESCE(new.raw_user_meta_data->>'available_investment', '0'))::numeric,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger asociado a la función anterior
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Función para permitir que un usuario elimine su propia cuenta de Auth
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID AS $$
BEGIN
  -- El trigger ON DELETE CASCADE en profiles se encargará de borrar el perfil
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
