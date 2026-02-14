
import React, { useEffect, useState, useRef } from 'react';
import { UserProfile, BusinessOpportunity } from '../types';
import { getUserSavedOpportunities, deleteUserOpportunity, updateUserProfile, updateUserEmail, deleteCurrentUserAccount } from '../services/supabaseService';
import { Briefcase, Trash2, Calendar, Mail, Phone, Wallet, Star, ArrowRight, Loader2, Bookmark, Edit2, Check, X, RefreshCw, Camera, DollarSign, AlertCircle, Upload } from 'lucide-react';

interface Props {
  user: UserProfile;
  onSelectOpportunity: (opp: BusinessOpportunity) => void;
  onUpdateUser: (updatedUser: UserProfile) => void;
}

const UserProfileView: React.FC<Props> = ({ user, onSelectOpportunity, onUpdateUser }) => {
  const [savedOpps, setSavedOpps] = useState<BusinessOpportunity[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Estados para edición
  const [editInvestment, setEditInvestment] = useState(user.availableInvestment);
  const [editEmail, setEditEmail] = useState(user.email);
  const [currentAvatar, setCurrentAvatar] = useState(user.avatarUrl || '');
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Estados para eliminación de cuenta
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadSaved();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [user.id]);

  const loadSaved = async () => {
    setLoadingOpps(true);
    try {
      const data = await getUserSavedOpportunities(user.id);
      setSavedOpps(data);
    } catch (e) {
      console.error("Error al cargar oportunidades:", e);
    } finally {
      setLoadingOpps(false);
    }
  };

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Error play video:", e));
        };
      }
    } catch (err: any) {
      console.error("Error crítico de cámara:", err);
      alert("No se pudo iniciar la cámara.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        context.translate(size, 0);
        context.scale(-1, 1);
        context.drawImage(video, startX, startY, size, size, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCurrentAvatar(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("La imagen es muy pesada. Máximo 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCurrentAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      // 1. Actualizar perfil en tabla 'profiles'
      const updatedUser = await updateUserProfile(user.id, {
        availableInvestment: editInvestment,
        avatarUrl: currentAvatar
      });

      // 2. Si el email cambió, intentar actualizarlo en Auth
      if (editEmail !== user.email) {
        await updateUserEmail(editEmail);
        alert("Se ha enviado un correo de confirmación a tu nueva dirección.");
        updatedUser.email = editEmail; // Actualización local del objeto
      }

      onUpdateUser(updatedUser);
      setIsEditing(false);
    } catch (err: any) {
      console.error("Error al guardar perfil:", err);
      alert(err.message || "Error al sincronizar con el servidor de perfiles.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;

    setIsUpdating(true);
    try {
      await deleteCurrentUserAccount(deletePassword);
      // Tras eliminar la cuenta, supabaseService ya hace signOut, 
      // pero el estado de la app debería reaccionar al evento de auth.
      // Aquí simplemente podríamos forzar una recarga o dejar que App.tsx maneje SIGNED_OUT
      alert("Tu cuenta ha sido eliminada exitosamente.");
      window.location.reload();
    } catch (err: any) {
      console.error("Error al eliminar cuenta:", err);
      alert(err.message || "Error al eliminar la cuenta. Verifica tu contraseña.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditInvestment(user.availableInvestment);
    setEditEmail(user.email);
    setCurrentAvatar(user.avatarUrl || '');
    stopCamera();
    setShowDeleteConfirm(false);
    setDeletePassword('');
  };

  const randomizeAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setCurrentAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    const opportunityToDelete = savedOpps.find(opp => opp.id === id);
    if (!opportunityToDelete) return;

    if (window.confirm(`¿Deseas eliminar "${opportunityToDelete.title}"? El monto de $${opportunityToDelete.initialInvestment.toLocaleString()} será reintegrado a tu capital.`)) {
      // Actualización optimista: removemos de la lista local antes de que termine el servidor
      const previousOpps = [...savedOpps];
      setSavedOpps(prev => prev.filter(opp => opp.id !== id));

      try {
        // 1. Eliminar la oportunidad de la base de datos
        await deleteUserOpportunity(user.id, id);

        // 2. Reintegrar el capital al usuario
        const newInvestment = user.availableInvestment + opportunityToDelete.initialInvestment;
        const updatedUser = await updateUserProfile(user.id, {
          availableInvestment: newInvestment
        });

        // 3. Notificar a la app el cambio de usuario para refrescar la UI global
        onUpdateUser(updatedUser);

      } catch (err) {
        console.error("Error al eliminar y reintegrar capital:", err);
        alert("No se pudo completar la operación. Intentando restaurar...");
        setSavedOpps(previousOpps); // Restauramos si falla
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-10 items-center md:items-start relative">
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-8 right-8 p-3 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all shadow-sm"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        )}

        <div className="relative flex-shrink-0 group">
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] bg-indigo-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center relative">
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <img
                src={currentAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                alt={user.fullName}
                className="w-full h-full object-cover"
              />
            )}
            {isEditing && !isCameraActive && (
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <Camera className="text-white w-8 h-8" />
              </div>
            )}
          </div>

          {isEditing && (
            <div className="absolute -bottom-2 -right-2 flex flex-col gap-3">
              {!isCameraActive ? (
                <>
                  <button
                    onClick={startCamera}
                    className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                    title="Tomar Foto"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                  <button
                    onClick={triggerFileInput}
                    className="p-3 bg-emerald-600 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                    title="Subir desde Dispositivo"
                  >
                    <Upload className="w-6 h-6" />
                  </button>
                  <button
                    onClick={randomizeAvatar}
                    className="p-3 bg-slate-800 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                    title="Avatar Aleatorio"
                  >
                    <RefreshCw className="w-6 h-6" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <button onClick={capturePhoto} className="p-4 bg-emerald-600 text-white rounded-full shadow-xl animate-pulse"><Check className="w-6 h-6" /></button>
                  <button onClick={stopCamera} className="p-3 bg-red-600 text-white rounded-full shadow-lg"><X className="w-6 h-6" /></button>
                </div>
              )}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex-grow text-center md:text-left space-y-6 self-center">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">{user.fullName}</h2>
            <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-indigo-600" /> Inversionista 2026
              </span>
              <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Miembro desde Feb 2026
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-4">
            <div className="flex items-center gap-3 text-slate-500 w-full md:w-auto">
              <Mail className="w-5 h-5 text-slate-300" />
              {isEditing ? (
                <div className="flex-grow">
                  <label className="block text-[8px] uppercase font-black text-indigo-400 mb-1">Email de la Cuenta</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="nuevo@email.com"
                  />
                </div>
              ) : (
                <span className="text-sm font-semibold">{user.email}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <Phone className="w-5 h-5 text-slate-300" />
              <span className="text-sm font-semibold">{user.phone || 'Sin teléfono'}</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 pt-4 w-full">
            {isEditing ? (
              <>
                <button
                  onClick={handleUpdateProfile}
                  disabled={isUpdating}
                  className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Guardar Cambios
                </button>
                <button onClick={handleCancel} className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center gap-2 hover:bg-slate-200 transition-all"><X className="w-5 h-5" /> Cancelar</button>
              </>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="text-[10px] font-black uppercase text-red-400 hover:text-red-600 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Borrar mi cuenta definitivamente
              </button>
            )}
          </div>

          {showDeleteConfirm && !isEditing && (
            <div className="mt-6 p-6 bg-red-50 border border-red-100 rounded-[2rem] space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <p className="text-xs font-black uppercase">Confirmar Eliminación</p>
              </div>
              <p className="text-xs text-red-500 font-medium">Esta acción es irreversible y tu saldo se perderá. Por favor ingresa tu contraseña para confirmar:</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Contraseña actual"
                  className="flex-grow bg-white border border-red-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={isUpdating || !deletePassword}
                  className="px-6 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Borrado"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`p-8 rounded-[2.5rem] w-full md:w-80 shadow-2xl transition-all flex flex-col items-center justify-center text-center ${isEditing ? 'bg-indigo-50 border-2 border-indigo-400 scale-105' : 'bg-slate-900 text-white shadow-slate-200'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isEditing ? 'bg-indigo-200' : 'bg-white/10'}`}>
            <Wallet className={`w-7 h-7 ${isEditing ? 'text-indigo-600' : 'text-indigo-400'}`} />
          </div>
          <p className={`text-[10px] uppercase font-black tracking-[0.2em] mb-1 ${isEditing ? 'text-indigo-500' : 'text-slate-500'}`}>Capital Inversión</p>
          {isEditing ? (
            <div className="mt-2 w-full">
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                <input
                  type="number"
                  value={editInvestment}
                  onChange={(e) => setEditInvestment(Number(e.target.value))}
                  className="w-full text-center text-2xl font-black text-indigo-900 bg-white border border-indigo-200 rounded-2xl py-3 pl-10 pr-4 outline-none"
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <p className="text-4xl font-black tracking-tight">${user.availableInvestment.toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Bookmark className="w-6 h-6 text-indigo-600" /> Mis Negocios Analizados</h3>
          <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{savedOpps.length} Proyectos</span>
        </div>

        {loadingOpps ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-slate-100"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-6" /><p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Sincronizando...</p></div>
        ) : savedOpps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-slate-200 border-dashed text-center px-10"><Briefcase className="w-10 h-10 text-slate-300 mb-6" /><h4 className="text-xl font-black text-slate-800">Tu portafolio está vacío</h4></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedOpps.map((opp) => (
              <div key={opp.id} onClick={() => onSelectOpportunity(opp)} className="group bg-white rounded-[2.5rem] border border-slate-200 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer relative">
                <button
                  onClick={(e) => handleDelete(e, opp.id)}
                  className="absolute top-6 right-6 z-20 p-2.5 bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  title="Eliminar de guardados"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="space-y-6">
                  <div className="pr-10"><h4 className="text-xl font-bold text-slate-900 line-clamp-1">{opp.title}</h4><p className="text-xs text-slate-500 mt-2 line-clamp-3">{opp.description}</p></div>
                  <div className="grid grid-cols-2 gap-6 py-5 border-y border-slate-50">
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión</p><p className="text-lg font-black text-slate-800">${opp.initialInvestment.toLocaleString()}</p></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ROI</p><p className="text-lg font-black text-emerald-600">{opp.expectedROI}</p></div>
                  </div>
                  <div className="flex items-center justify-between pt-2"><span className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1.5">Detalles <ArrowRight className="w-4 h-4" /></span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileView;
