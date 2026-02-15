
import React, { useState, useEffect } from 'react';
import { Search, MapPin, DollarSign, Loader2, Info, ExternalLink, Globe, Smartphone, TrendingUp, BarChart2, ShoppingBag, RefreshCw, ArrowLeft, UserPlus, LogOut, User, LayoutDashboard, LogIn, Wallet, Zap, AlertCircle } from 'lucide-react';
import { analyzeOpportunities, AnalysisType } from './services/geminiService';
import { BusinessOpportunity, AnalysisResult, UserProfile } from './types';
import { supabase, getCurrentUserProfile } from './services/supabaseService';
import OpportunityCard from './components/OpportunityCard';
import OpportunityModal from './components/OpportunityModal';
import AuthModal from './components/AuthModal';
import UserProfileView from './components/UserProfileView';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [investment, setInvestment] = useState<number>(50000); // Monto a invertir por búsqueda
  const [location, setLocation] = useState<string>('Santiago de Chile');
  const [loading, setLoading] = useState<boolean>(false);
  const [appInit, setAppInit] = useState<boolean>(true);
  const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<BusinessOpportunity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [view, setView] = useState<'main' | 'profile'>('main');
  const [authConfig, setAuthConfig] = useState<{ show: boolean; mode: 'login' | 'register' }>({ show: false, mode: 'register' });

  // Inicializar sesión de Supabase
  useEffect(() => {
    const initSession = async () => {
      const profile = await getCurrentUserProfile();
      if (profile) {
        setUser(profile);
        // Sugerir por defecto la mitad del presupuesto o 50k
        setInvestment(Math.min(profile.availableInvestment, 50000) || 50000);
      }
      setAppInit(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const profile = await getCurrentUserProfile();
        if (profile) {
          setUser(profile);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setResult(null);
        setError(null);
        setView('main');
        setShowLogoutConfirm(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Geolocalización inicial
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
            const data = await response.json();
            if (data.address && data.address.country) {
              setLocation(data.address.country);
            }
          } catch (e) {
            console.error("No se pudo obtener la ubicación precisa");
          }
        },
        () => console.log("Permiso de ubicación denegado")
      );
    }
  }, []);

  const handleSearch = async (type: AnalysisType) => {
    if (!user) {
      setAuthConfig({ show: true, mode: 'register' });
      return;
    }

    if (investment <= 0) {
      setError("Por favor ingresa un monto de inversión válido.");
      return;
    }

    if (investment > user.availableInvestment) {
      setError(`El monto solicitado ($${investment.toLocaleString()}) supera tu presupuesto disponible ($${user.availableInvestment.toLocaleString()}).`);
      return;
    }

    setLoading(true);
    setAnalysisType(type);
    setError(null);
    setView('main');
    console.log("Ejecutando handleSearch...");

    try {
      console.log("Llamando a analyzeOpportunities...");
      // Usar una bandera de cancelación simple para esta implementación
      // En una implementación real más compleja se usaría AbortController
      const data = await analyzeOpportunities(investment, location, type);

      // Solo actualizar si sigue cargando (no se detuvo manualmente)
      setLoading(prev => {
        if (prev) {
          if (data && data.opportunities && Array.isArray(data.opportunities)) {
            setResult(data);
          } else {
            console.error("Datos recibidos inválidos:", data);
            setError("La respuesta del servidor no tiene el formato correcto.");
          }
        }
        return false;
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error inesperado al analizar las oportunidades.");
      setLoading(false);
    }
  };

  const handleStopSearch = () => {
    setLoading(false);
    setError("Búsqueda detenida por el usuario.");
  };

  const setMaxInvestment = () => {
    if (user) {
      setInvestment(user.availableInvestment);
    }
  };

  // Efecto para asegurar que el monto de búsqueda no exceda el nuevo saldo tras invertir
  useEffect(() => {
    if (user && investment > user.availableInvestment) {
      setInvestment(user.availableInvestment);
    }
  }, [user?.availableInvestment]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const openAuth = (mode: 'login' | 'register') => {
    setAuthConfig({ show: true, mode });
  };

  if (appInit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setView('main')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent hidden md:block">OportuniA</h1>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div
                  className="text-right hidden sm:block cursor-pointer group"
                  onClick={() => setView('profile')}
                >
                  <p className="text-xs font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{user.fullName}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">Disponible: ${user.availableInvestment.toLocaleString()}</p>
                </div>
                <div
                  onClick={() => setView('profile')}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center overflow-hidden cursor-pointer transition-all ${view === 'profile' ? 'ring-2 ring-indigo-500 border-indigo-500' : 'bg-indigo-50 border-indigo-100'}`}
                >
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-indigo-500" />}
                </div>
                <button onClick={() => setShowLogoutConfirm(true)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all" title="Cerrar Sesión">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth('login')}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-100"
                >
                  <UserPlus className="w-4 h-4" />
                  Registrarse
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {view === 'profile' && user ? (
        <main className="max-w-7xl mx-auto px-4 py-12">
          <UserProfileView
            user={user}
            onSelectOpportunity={setSelectedOpp}
            onUpdateUser={(u) => setUser(u)}
            onLogout={() => setShowLogoutConfirm(true)}
          />
        </main>
      ) : (
        <>
          <section className="bg-indigo-700 py-12 md:py-20 px-4 text-center overflow-hidden relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-4xl mx-auto relative z-10">
              <h2 className="text-4xl md:text-7xl font-black text-white mb-4 leading-tight tracking-tight px-2">
                OportuniA <span className="text-indigo-300">IA</span>
              </h2>
              <p className="text-indigo-100 text-base md:text-xl mb-10 font-medium max-w-2xl mx-auto px-6 opacity-90">
                Analizamos tendencias reales para decirte exactamente qué vender en 2026 según tu presupuesto.
              </p>

              {user && (
                <div className="mb-8 inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-2xl animate-in fade-in zoom-in">
                  <div className="flex items-center gap-2 text-white">
                    <Wallet className="w-4 h-4 text-indigo-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Saldo:</span>
                    <span className="text-base font-black text-emerald-400">${user.availableInvestment.toLocaleString()}</span>
                  </div>
                  <div className="h-4 w-px bg-white/20"></div>
                  <button
                    onClick={() => setView('profile')}
                    className="text-[10px] font-black uppercase text-indigo-200 hover:text-white transition-colors"
                  >
                    Añadir
                  </button>
                </div>
              )}

              <div className="bg-white p-2 md:p-3 rounded-3xl md:rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto border border-indigo-100/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <div className="flex items-center px-5 py-3 bg-slate-50 rounded-2xl border border-slate-100 transition-all focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white group">
                    <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center mr-3 group-focus-within:bg-indigo-600 group-focus-within:text-white transition-colors">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <label className="block text-[9px] uppercase font-black text-slate-400 tracking-tighter mb-0.5">Inversión</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-slate-400">$</span>
                        <input
                          type="number"
                          value={investment}
                          onChange={(e) => setInvestment(Number(e.target.value))}
                          className="w-full focus:outline-none text-slate-800 font-black text-lg bg-transparent"
                          placeholder="0.00"
                        />
                        {user && investment < user.availableInvestment && (
                          <button
                            onClick={setMaxInvestment}
                            className="bg-indigo-50 text-indigo-600 px-1.5 py-1 rounded-lg text-[9px] font-black hover:bg-indigo-100 shrink-0"
                          >
                            MÁX
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center px-5 py-3 bg-slate-50 rounded-2xl border border-slate-100 transition-all focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white group">
                    <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center mr-3 group-focus-within:bg-indigo-600 group-focus-within:text-white transition-colors">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <label className="block text-[9px] uppercase font-black text-slate-400 tracking-tighter mb-0.5">Ubicación</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full focus:outline-none text-slate-800 font-black text-lg bg-transparent"
                        placeholder="Ciudad o País"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleSearch('products')}
                    disabled={loading}
                    className={`flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-[1.8rem] font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 disabled:opacity-50 active:scale-95 group ${loading ? 'opacity-80' : ''}`}
                  >
                    {loading && !result ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ShoppingBag className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    )}
                    <span className="text-base md:text-lg uppercase tracking-tight">Cazar Oportunidades</span>
                  </button>

                  {loading && (
                    <button
                      onClick={handleStopSearch}
                      className="sm:w-48 bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-100 px-6 py-4 md:py-5 rounded-2xl md:rounded-[1.8rem] font-black transition-all flex items-center justify-center gap-2 active:scale-95 animate-in slide-in-from-right-2"
                    >
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                      <span className="text-sm md:text-base uppercase tracking-tight">Detener</span>
                    </button>
                  )}
                </div>
              </div>

              {!user && (
                <div className="mt-8 flex items-center justify-center gap-4 bg-indigo-800/30 w-fit mx-auto px-6 py-2 rounded-full border border-white/5">
                  <p className="text-xs text-indigo-200 font-bold uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    Inicia sesión para usar tu saldo real
                  </p>
                  <button
                    onClick={() => openAuth('login')}
                    className="text-xs text-white font-black underline underline-offset-4 hover:text-white transition-colors uppercase tracking-widest"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
          </section>

          <main className="max-w-7xl mx-auto px-4 mt-12">
            {error && (
              <div className="bg-red-50 border-2 border-red-100 text-red-600 p-6 rounded-3xl mb-8 flex items-start gap-4 animate-in shake duration-300">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider mb-1">Error de Análisis</h4>
                  <p className="text-sm font-medium opacity-80">{error}</p>
                </div>
              </div>
            )}

            {loading && !result && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-200 rounded-full blur-3xl opacity-50 animate-pulse"></div>
                  <div className="w-24 h-24 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin flex items-center justify-center relative">
                    <Smartphone className="w-10 h-10 text-indigo-600" />
                  </div>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-2 tracking-tight">
                  Analizando Mercado 2026...
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto font-medium text-sm md:text-base px-4">
                  OportuniA está filtrando los nichos más rentables en {location} usando IA de última generación.
                </p>
              </div>
            )}

            {result && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm mb-12 flex flex-col md:flex-row gap-8 items-center">
                  <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center flex-shrink-0">
                    <BarChart2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight flex items-center">
                      Reporte de Mercado Local
                    </h2>
                    <p className="text-slate-600 leading-relaxed text-lg font-medium">
                      {result.marketOverview}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-8 px-4">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">{result.opportunities?.length || 0} Sugerencias para invertir ${investment.toLocaleString()} {result.currencyCode}</h3>
                  <button
                    onClick={() => {
                      setResult(null);
                      setAnalysisType(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Limpiar Búsquedas
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {result.opportunities?.map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      onSelect={setSelectedOpp}
                      currencySymbol={result.currencySymbol}
                      currencyCode={result.currencyCode}
                    />
                  ))}
                </div>

                {result.sources.length > 0 && (
                  <div className="mt-20 bg-slate-900 rounded-[3rem] p-10 text-white">
                    <div className="flex items-center gap-3 mb-8">
                      <Globe className="w-6 h-6 text-indigo-400" />
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Fuentes de Datos 2026</h4>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {result.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 hover:border-indigo-500/50 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-3 text-indigo-400" />
                          {source.title.length > 50 ? source.title.substring(0, 50) + '...' : source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!loading && !result && !error && (
              <div className="max-w-4xl mx-auto text-center py-24 px-4 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <Search className="w-12 h-12 text-indigo-600" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Encuentra tu próximo flujo de ingresos</h3>
                <p className="text-slate-500 text-lg mb-10 max-w-xl mx-auto font-medium">Ingresa el monto que tienes disponible para un nuevo proyecto y deja que nuestra IA analice el mercado de 2026 por ti.</p>
                {!user && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={() => openAuth('register')}
                      className="w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs"
                    >
                      Empezar Ahora
                    </button>
                    <button
                      onClick={() => openAuth('login')}
                      className="w-full sm:w-auto px-10 py-4 bg-white border-2 border-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                    >
                      Ya tengo cuenta
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </>
      )}

      {selectedOpp && (
        <OpportunityModal
          opportunity={selectedOpp}
          onClose={() => setSelectedOpp(null)}
          user={user}
          onUpdateUser={(updatedUser) => setUser(updatedUser)}
        />
      )}

      {authConfig.show && (
        <AuthModal
          initialMode={authConfig.mode}
          onClose={() => setAuthConfig({ ...authConfig, show: false })}
          onSuccess={(userData) => setUser(userData)}
        />
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <LogOut className="w-8 h-8 text-red-500" />
            </div>

            <h3 className="text-xl font-black text-slate-900 text-center mb-2 tracking-tight">¿Cerrar Sesión?</h3>
            <p className="text-slate-500 text-center text-sm font-medium mb-8">
              Tu sesión actual terminará. Tendrás que volver a autenticarte para ver tus negocios guardados.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleLogout}
                className="w-full py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-red-200"
              >
                Cerrar Sesión Definitivamente
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-4 bg-slate-50 text-slate-400 font-bold rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-12 text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] px-6 leading-relaxed">
        <p>© 2026 OportuniA IA. Los análisis se basan en datos y tendencias de mercado actualizadas al 14 de febrero de 2026. Conectado a Supabase.</p>
      </footer>
    </div>
  );
};

export default App;
