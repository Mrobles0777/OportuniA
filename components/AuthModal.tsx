
import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, DollarSign, Loader2, ArrowRight, LogIn, AlertCircle, Clock, Inbox, Send, ShieldAlert } from 'lucide-react';
import { supabase, getCurrentUserProfile, resendConfirmationEmail, signInWithGoogle } from '../services/supabaseService';
import { UserProfile } from '../types';

interface Props {
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

const AuthModal: React.FC<Props> = ({ onClose, onSuccess, initialMode = 'register' }) => {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'critical' | 'warning' | 'info' | 'success'>('critical');
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [cooldown, setCooldown] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    investment: 100000
  });

  // Manejador del contador de bloqueo
  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!formData.email) {
      setError("Por favor ingresa tu correo electrónico.");
      setErrorType('warning');
      return;
    }
    setResending(true);
    try {
      await resendConfirmationEmail(formData.email);
      setError("✅ Enlace enviado. Revisa tu carpeta de Entrada y SPAM.");
      setErrorType('success');
    } catch (err: any) {
      setError("No se pudo reenviar: " + err.message);
      setErrorType('critical');
    } finally {
      setResending(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // El login OAuth redirige la página, por lo que no necesitamos manejar el resultado aquí directamente
    } catch (err: any) {
      console.error("Google login error:", err);
      setError("No se pudo iniciar sesión con Google: " + err.message);
      setErrorType('critical');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || cooldown > 0) return;

    setLoading(true);
    setError(null);
    setErrorType('critical');

    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
              available_investment: formData.investment
            }
          }
        });

        if (signUpError) throw signUpError;

        if (data.user && !data.session) {
          setError("¡Registro exitoso! Por seguridad, debes confirmar tu email haciendo clic en el enlace que te enviamos.");
          setErrorType('info');
          setLoading(false);
          return;
        }

        const profile = await getCurrentUserProfile();
        if (profile) {
          onSuccess(profile);
          onClose();
        }

      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (signInError) throw signInError;

        const profile = await getCurrentUserProfile();
        if (profile) {
          onSuccess(profile);
          onClose();
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let errorMsg = err.message || "Error desconocido.";
      const lowMsg = errorMsg.toLowerCase();

      if (lowMsg.includes("rate limit") || lowMsg.includes("too many requests")) {
        errorMsg = "⏳ Límite de seguridad alcanzado. El acceso se ha bloqueado temporalmente por 60 segundos para proteger tu cuenta.";
        setErrorType('warning');
        setCooldown(60); // Bloqueo de 1 minuto
      } else if (lowMsg.includes("invalid login credentials")) {
        errorMsg = "❌ Credenciales incorrectas. Verifica tu correo y contraseña.";
        setErrorType('critical');
      } else if (lowMsg.includes("email not confirmed")) {
        errorMsg = "📧 Tu cuenta requiere activación por correo. ¿Deseas reenviar el código?";
        setErrorType('warning');
      } else {
        setErrorType('critical');
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'investment' ? Number(value) : value
    }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {mode === 'register' ? 'Nuevo Inversionista' : 'Bienvenido de nuevo'}
              </h2>
              <p className="text-sm text-slate-500">
                {mode === 'register' ? 'Crea tu perfil para guardar negocios.' : 'Ingresa a tu panel de control IA.'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {error && (
            <div className={`mb-6 p-4 rounded-2xl space-y-3 border animate-in slide-in-from-top-2 duration-300 ${errorType === 'warning' ? 'bg-amber-50 border-amber-200' :
                errorType === 'info' ? 'bg-indigo-50 border-indigo-200' :
                  errorType === 'success' ? 'bg-emerald-50 border-emerald-200' :
                    'bg-red-50 border-red-200'
              }`}>
              <div className="flex items-start gap-3">
                {errorType === 'warning' ? (
                  <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                ) : errorType === 'info' ? (
                  <Inbox className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                ) : errorType === 'success' ? (
                  <Send className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-xs font-bold leading-relaxed ${errorType === 'warning' ? 'text-amber-700' :
                      errorType === 'info' ? 'text-indigo-700' :
                        errorType === 'success' ? 'text-emerald-700' :
                          'text-red-700'
                    }`}>
                    {error}
                  </p>

                  {error.includes("reenviar el código") && (
                    <button
                      onClick={handleResend}
                      disabled={resending}
                      className="mt-2 text-[10px] uppercase font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-all"
                    >
                      {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Reenviar enlace de activación ahora
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={loading || cooldown > 0}
              className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.57l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google
            </button>

            <div className="relative flex items-center gap-4 py-2">
              <div className="h-px bg-slate-100 flex-1"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">O con tu correo</span>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    name="fullName"
                    type="text"
                    placeholder="Juan Pérez"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      name="phone"
                      type="tel"
                      placeholder="+52"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Inversión (LCL)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      name="investment"
                      type="number"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                      value={formData.investment}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              disabled={loading || cooldown > 0}
              type="submit"
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg mt-4 ${cooldown > 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-400'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02] active:scale-[0.98]'
                }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : cooldown > 0 ? (
                <>
                  <ShieldAlert className="w-5 h-5" />
                  Bloqueado ({cooldown}s)
                </>
              ) : (
                <>
                  {mode === 'register' ? 'Crear mi Cuenta' : 'Entrar al Panel'}
                  {mode === 'register' ? <ArrowRight className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              disabled={loading || cooldown > 0}
              onClick={() => {
                setMode(mode === 'register' ? 'login' : 'register');
                setError(null);
              }}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
            >
              {mode === 'register' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
