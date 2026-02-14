
import React, { useState } from 'react';
import { BusinessOpportunity, UserProfile } from '../types';
// Added RefreshCw to imports
import { X, Check, AlertTriangle, Target, LineChart, ExternalLink, Loader2, FileText, FileDown, Truck, Save, BookmarkCheck, Wallet, MinusCircle, Zap } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { generateMarketingContent, generateImagePromptFromScript } from '../services/geminiService';
import { saveUserOpportunity, updateUserProfile } from '../services/supabaseService';
import { jsPDF } from 'jspdf';

interface Props {
  opportunity: BusinessOpportunity;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateUser: (user: UserProfile) => void;
}

const OpportunityModal: React.FC<Props> = ({ opportunity, onClose, user, onUpdateUser }) => {
  const [marketingContent, setMarketingContent] = useState<string | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const roiData = [
    { name: 'Mes 3', value: 20 },
    { name: 'Mes 6', value: 50 },
    { name: 'Mes 9', value: 85 },
    { name: 'Mes 12', value: 120 },
  ];

  const hasEnoughBudget = user ? user.availableInvestment >= opportunity.initialInvestment : false;

  const handleGenerateContent = async () => {
    setIsGeneratingContent(true);
    try {
      const content = await generateMarketingContent(opportunity.title, opportunity.description, opportunity.marketingStrategy);
      setMarketingContent(content);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleSaveOpportunity = async () => {
    if (!user) {
      alert("Debes iniciar sesión para ejecutar esta acción.");
      return;
    }

    if (!hasEnoughBudget) {
      alert("No tienes suficiente saldo disponible para esta inversión.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Guardar la oportunidad en la base de datos
      await saveUserOpportunity(user.id, opportunity);

      // 2. Calcular y actualizar el nuevo saldo
      const newInvestment = user.availableInvestment - opportunity.initialInvestment;

      const updatedUser = await updateUserProfile(user.id, {
        availableInvestment: newInvestment
      });

      // 3. Notificar a la aplicación para actualizar el estado global y la UI
      onUpdateUser(updatedUser);

      setSaveSuccess(true);

      // Feedback visual extendido antes de que el usuario cierre el modal
      setTimeout(() => {
        // Podríamos cerrar el modal automáticamente o dejar que el usuario vea el éxito
      }, 2000);

    } catch (error: any) {
      console.error("Error en la transacción:", error);
      alert(`Error al procesar la inversión: ${error.message || 'Error de conexión con el servidor'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header Rebranded
      pdf.setFontSize(24);
      pdf.setTextColor(79, 70, 229); // Indigo 600
      pdf.text('OportuniA IA - Reporte de Negocio', margin, y);
      y += 15;

      // Title
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42); // Slate 900
      pdf.text(opportunity.title, margin, y);
      y += 10;

      // Overview
      pdf.setFontSize(12);
      pdf.setTextColor(71, 85, 105); // Slate 600
      const splitDesc = pdf.splitTextToSize(opportunity.description, pageWidth - margin * 2);
      pdf.text(splitDesc, margin, y);
      y += (splitDesc.length * 7) + 10;

      // Strategy
      pdf.setFontSize(14);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Estrategia de Crecimiento', margin, y);
      y += 8;
      pdf.setFontSize(11);
      pdf.setTextColor(71, 85, 105);
      const splitStrategy = pdf.splitTextToSize(opportunity.marketingStrategy, pageWidth - margin * 2);
      pdf.text(splitStrategy, margin, y);
      y += (splitStrategy.length * 6) + 15;

      // Data summary
      pdf.setFontSize(14);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Datos Financieros', margin, y);
      y += 8;
      pdf.setFontSize(11);
      pdf.text(`Inversión Inicial: ${opportunity.initialInvestment.toLocaleString()}`, margin, y);
      y += 6;
      pdf.text(`Retorno Esperado (ROI): ${opportunity.expectedROI}`, margin, y);
      y += 15;

      // MARKETING CONTENT (Ventas Viral) - NEW
      if (marketingContent) {
        if (y > 240) { pdf.addPage(); y = 20; }

        pdf.setFontSize(16);
        pdf.setTextColor(16, 185, 129); // Emerald 500
        pdf.text('Guion de Ventas Viral (IA)', margin, y);
        y += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59); // Slate 800
        const splitMarketing = pdf.splitTextToSize(marketingContent, pageWidth - margin * 2);

        // Handle pagination for marketing content
        splitMarketing.forEach((line: string) => {
          if (y > 275) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(line, margin, y);
          y += 5;
        });
      }

      pdf.save(`OportuniA_${opportunity.title.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-6xl h-[92vh] md:h-auto md:max-h-[95vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom md:zoom-in duration-300">
        <div className="px-6 py-5 md:p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">{opportunity.title}</h2>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1">
              <a href={opportunity.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] md:text-[10px] text-indigo-600 font-black uppercase tracking-wider hover:underline flex items-center">
                <ExternalLink className="w-3 h-3 mr-1" /> Referencia
              </a>
              {user && (
                <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black text-indigo-600 border border-indigo-100/50">
                  <Wallet className="w-3 h-3" /> ${user.availableInvestment.toLocaleString()}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
            <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-8 space-y-6 md:space-y-8">
              <section className="bg-slate-50 p-5 md:p-6 rounded-3xl border border-slate-100">
                <h3 className="text-base md:text-lg font-black text-slate-800 mb-2 md:mb-3 flex items-center gap-2 uppercase tracking-tight">
                  <Target className="w-5 h-5 text-indigo-600" /> Estrategia de Crecimiento
                </h3>
                <p className="text-slate-600 leading-relaxed italic border-l-4 border-indigo-500 pl-4 text-xs md:text-sm">
                  "{opportunity.marketingStrategy}"
                </p>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {opportunity.suppliers.map((supplier, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:border-indigo-200 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-tighter">{supplier.name}</span>
                      <a href={supplier.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-600"><ExternalLink className="w-4 h-4" /></a>
                    </div>
                    <div className="mt-auto bg-indigo-50 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-black text-indigo-600">
                      <Truck className="w-3.5 h-3.5" /> {supplier.shippingDays} DÍAS
                    </div>
                  </div>
                ))}
              </section>

              <section className="bg-indigo-50 rounded-[2rem] p-8 border border-indigo-100 min-h-[300px] flex flex-col">
                {marketingContent ? (
                  <div className="flex-grow overflow-y-auto text-[10px] text-slate-700 font-mono bg-white p-5 rounded-2xl border border-indigo-100 custom-scrollbar">
                    {marketingContent}
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4">
                    <FileText className="w-12 h-12 text-indigo-300 mx-auto" />
                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Guion de Ventas Viral</p>
                    <button onClick={handleGenerateContent} disabled={isGeneratingContent} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 transition-all">
                      {isGeneratingContent ? <Loader2 className="animate-spin w-4 h-4" /> : "Redactar Contenido"}
                    </button>
                  </div>
                )}
              </section>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-indigo-600" /> ROI Proyectado
                </h3>
                <div className="h-40 w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roiData}><Bar dataKey="value" radius={[5, 5, 0, 0]}>{roiData.map((_, i) => <Cell key={i} fill={i === 3 ? '#4f46e5' : '#818cf8'} />)}</Bar></BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Inversión Necesaria</span>
                    <span className="text-lg font-black text-slate-900">${opportunity.initialInvestment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Rentabilidad Anual</span>
                    <span className="text-lg font-black text-emerald-600">{opportunity.expectedROI}</span>
                  </div>
                </div>
              </div>

              {user && (
                <div className={`p-6 rounded-[2rem] border-2 transition-all ${hasEnoughBudget ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <h4 className="text-xs font-black uppercase text-slate-800 mb-4 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-indigo-600" /> Análisis de Presupuesto
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-500">Saldo Actual</span>
                      <span className="text-slate-900">${user.availableInvestment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-500">Costo del Negocio</span>
                      <span className="text-red-500">-${opportunity.initialInvestment.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px] font-black">
                      <span className="text-slate-800">Saldo Final</span>
                      <span className={hasEnoughBudget ? 'text-emerald-600' : 'text-red-600'}>
                        ${(user.availableInvestment - opportunity.initialInvestment).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {!hasEnoughBudget && (
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-red-600 uppercase">
                      <AlertTriangle className="w-4 h-4" /> Saldo insuficiente para invertir
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex flex-col items-center shrink-0">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full justify-center">
            <button onClick={onClose} className="px-8 py-4 bg-white border border-slate-200 text-slate-500 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-[9px] md:text-[10px] shadow-sm">Cerrar</button>
            <button onClick={handleExportPDF} disabled={isExporting} className="px-8 py-4 bg-white border border-indigo-200 text-indigo-600 font-black rounded-2xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-all uppercase tracking-widest text-[9px] md:text-[10px]">
              {isExporting ? <Loader2 className="animate-spin w-4 h-4" /> : <FileDown className="w-4 h-4" />} {isExporting ? "Preparando..." : "Descargar PDF"}
            </button>
            <button
              onClick={handleSaveOpportunity}
              disabled={isSaving || saveSuccess || (user !== null && !hasEnoughBudget)}
              className={`px-10 py-4 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl uppercase tracking-widest text-[9px] md:text-[10px] ${saveSuccess
                ? 'bg-emerald-100 text-emerald-700'
                : !hasEnoughBudget && user !== null
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 disabled:opacity-50 shadow-indigo-200'
                }`}
            >
              {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : saveSuccess ? <BookmarkCheck className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              {saveSuccess ? "¡Adquirido!" : !hasEnoughBudget && user !== null ? "Saldo Insuficiente" : "Ejecutar con OportuniA"}
            </button>
          </div>
          {saveSuccess && (
            <p className="mt-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest animate-bounce px-4 text-center">
              Capital descontado. La oportunidad se ha guardado en tu perfil.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpportunityModal;
