
import { createClient } from '@supabase/supabase-js';
import { UserProfile, BusinessOpportunity } from "../types";

// URL de la instancia de Supabase
// URL de la instancia de Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Clave Anon Public Key (JWT) proporcionada por el usuario
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing in environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Inicia sesión con Google OAuth
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
  return data;
};

/**
 * Mapea la respuesta de la base de datos al tipo UserProfile de la aplicación
 */
const mapProfile = (data: any, email: string = ''): UserProfile => ({
  id: data.id,
  email: email || data.email || '',
  fullName: data.full_name || 'Inversor',
  phone: data.phone || '',
  availableInvestment: Number(data.available_investment || 0),
  avatarUrl: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email || data.id}`,
  createdAt: data.created_at || new Date().toISOString()
});

/**
 * Obtiene el perfil del usuario actual. 
 * Si no existe en la tabla 'profiles', extrae los datos de los metadatos del usuario (Auth).
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Si no hay usuario en auth, comprobamos la sesión directamente por si auth.getUser() falla por latencia
    if (userError || !user) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) return null;

      const sUser = sessionData.session.user;
      return {
        id: sUser.id,
        email: sUser.email || '',
        fullName: sUser.user_metadata?.full_name || 'Nuevo Inversor',
        phone: sUser.user_metadata?.phone || '',
        availableInvestment: Number(sUser.user_metadata?.available_investment || 0),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${sUser.email}`,
        createdAt: sUser.created_at
      };
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.warn("Perfil no encontrado en tabla, usando metadatos de sesión.");
      return {
        id: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || 'Nuevo Inversor',
        phone: user.user_metadata?.phone || '',
        availableInvestment: Number(user.user_metadata?.available_investment || 0),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
        createdAt: user.created_at
      };
    }

    return mapProfile(profile, user.email);
  } catch (err) {
    console.error("Error al obtener perfil actual:", err);
    return null;
  }
};

/**
 * Reenvía el correo de confirmación de registro
 */
export const resendConfirmationEmail = async (email: string) => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
  });
  if (error) throw error;
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<UserProfile> => {
  console.log("Updating user profile for:", userId, updates);
  const dbUpdates: any = {};
  if (updates.availableInvestment !== undefined) dbUpdates.available_investment = updates.availableInvestment;
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error("Error en updateUserProfile (DB Update):", error);
    throw error;
  }

  // Obtenemos el email actual de la sesión para evitar llamar a auth.getUser() que puede ser lento
  const { data: sessionData } = await supabase.auth.getSession();
  const currentEmail = sessionData.session?.user?.email || '';

  console.log("Profile updated successfully:", data);
  return mapProfile(data, currentEmail);
};

/**
 * Actualiza el correo electrónico del usuario. 
 * Requiere confirmación si "Secure email change" está habilitado en Supabase.
 */
export const updateUserEmail = async (newEmail: string) => {
  const { data, error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
  return data;
};

/**
 * Elimina la cuenta del usuario actual.
 * Primero valida la contraseña re-autenticando al usuario.
 */
export const deleteCurrentUserAccount = async (password: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error("No hay usuario autenticado.");

  // 1. Verificar contraseña re-autenticando
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: password
  });

  if (authError) {
    throw new Error("Contraseña incorrecta. No se puede eliminar la cuenta.");
  }

  // 2. Llamar al RPC para eliminar la cuenta (auth.users)
  const { error: deleteError } = await supabase.rpc('delete_user_account');
  if (deleteError) throw deleteError;

  // 3. Cerrar sesión localmente
  await supabase.auth.signOut();
};

export const saveUserOpportunity = async (userId: string, opportunity: BusinessOpportunity) => {
  console.log("Saving opportunity for user:", userId, opportunity.title);
  const { error } = await supabase
    .from('saved_opportunities')
    .insert({
      user_id: userId,
      title: opportunity.title,
      description: opportunity.description,
      initial_investment: opportunity.initialInvestment,
      expected_roi: opportunity.expectedROI,
      difficulty: opportunity.difficulty,
      marketing_strategy: opportunity.marketingStrategy,
      reference_url: opportunity.referenceUrl,
      suppliers: opportunity.suppliers
    });

  if (error) {
    console.error("Error al guardar oportunidad (DB Insert):", error);
    throw error;
  }
  console.log("Opportunity saved successfully");
};

export const getUserSavedOpportunities = async (userId: string): Promise<BusinessOpportunity[]> => {
  try {
    const { data, error } = await supabase
      .from('saved_opportunities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      initialInvestment: Number(item.initial_investment),
      expectedROI: item.expected_roi,
      difficulty: item.difficulty,
      marketingStrategy: item.marketing_strategy,
      reference_url: item.reference_url,
      suppliers: item.suppliers || [],
      trends: []
    }));
  } catch (err) {
    console.error("Error al obtener oportunidades guardadas:", err);
    return [];
  }
};

export const deleteUserOpportunity = async (userId: string, opportunityId: string) => {
  const { error } = await supabase
    .from('saved_opportunities')
    .delete()
    .eq('id', opportunityId)
    .eq('user_id', userId);

  if (error) throw error;
};
