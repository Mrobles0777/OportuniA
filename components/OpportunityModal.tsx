
import React, { useState } from 'react';
import { BusinessOpportunity, UserProfile } from '../types';
// Added RefreshCw to imports
import { X, Check, AlertTriangle, Target, LineChart, ExternalLink, Loader2, FileText, FileDown, Truck, Save, BookmarkCheck, Wallet, MinusCircle, Zap, Image as ImageIcon, Copy, Share2, Download, Sparkles } from 'lucide-react';
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
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const prompt = await generateImagePromptFromScript(marketingContent || opportunity.description);
      // Usamos Pollinations AI para generar la imagen basada en el prompt de Gemini
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      setGeneratedImage(imageUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopyContent = () => {
    if (marketingContent) {
      navigator.clipboard.writeText(marketingContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
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
      await saveUserOpportunity(user.id, opportunity);
      const newInvestment = user.availableInvestment - opportunity.initialInvestment;
      const updatedUser = await updateUserProfile(user.id, {
        availableInvestment: newInvestment
      });
      onUpdateUser(updatedUser);
      setSaveSuccess(true);
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
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let y = 20;

      // Helper to clean emojis (Borrar emojis para evitar símbolos extraños)
      const cleanText = (text: string) => {
        return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
      };

      // Header Centered
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(79, 70, 229);
      pdf.text('OportuniA IA', pageWidth / 2, y, { align: 'center' });
      y += 8;

      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184);
      pdf.text('REPORTE ESTRATÉGICO DE NEGOCIO', pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Image (si existe)
      if (generatedImage) {
        try {
          // Intentar cargar la imagen en el PDF
          pdf.addImage(generatedImage, 'JPEG', margin, y, pageWidth - (margin * 2), 100);
          y += 110;
        } catch (e) {
          console.error("No se pudo cargar la imagen en el PDF", e);
        }
      }

      // Title
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      const cleanTitle = cleanText(opportunity.title);
      pdf.text(cleanTitle, pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Summary
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(71, 85, 105);
      const splitDesc = pdf.splitTextToSize(cleanText(opportunity.description), pageWidth - (margin * 2));
      pdf.text(splitDesc, margin, y);
      y += (splitDesc.length * 6) + 10;

      // Strategy Box
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(margin - 2, y - 5, pageWidth - (margin * 2) + 4, 35, 3, 3, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Estrategia de Crecimiento', margin, y);
      y += 7;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      const splitStrategy = pdf.splitTextToSize(cleanText(opportunity.marketingStrategy), pageWidth - (margin * 2));
      pdf.text(splitStrategy, margin, y);
      y += 28;

      // Financials
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Proyección Financiera', margin, y);
      y += 8;

      pdf.setFontSize(11);
      pdf.setTextColor(16, 185, 129);
      pdf.text(`Inversión Inicial: $${opportunity.initialInvestment.toLocaleString()}`, margin, y);
      y += 6;
      pdf.text(`ROI Esperado: ${opportunity.expectedROI}`, margin, y);
      y += 15;

      // Marketing Script
      if (marketingContent) {
        if (y > pageHeight - 60) { pdf.addPage(); y = 20; }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(15);
        pdf.setTextColor(79, 70, 229);
        pdf.text('Guion de Ventas Viral (IA)', margin, y);
        y += 10;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(51, 65, 85);
        const splitMarketing = pdf.splitTextToSize(cleanText(marketingContent), pageWidth - (margin * 2));

        splitMarketing.forEach((line: string) => {
          if (y > pageHeight - 20) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(line, margin, y);
          y += 5;
        });
      }

      // Footer numbering
      const totalPages = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        pdf.text(`Generado por OportuniA IA - ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);
      }

      pdf.save(`Plan_OportuniA_${opportunity.title.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error al exportar PDF");
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
                {opportunity.suppliers?.map((supplier, idx) => (
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

              <section className="bg-indigo-50 rounded-[2rem] p-6 md:p-8 border border-indigo-100 min-h-[300px] flex flex-col gap-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Marketing & Visuales IA</h4>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    {marketingContent && (
                      <button
                        onClick={handleCopyContent}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                      >
                        {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copySuccess ? "Copiado" : "Copiar Guion"}
                      </button>
                    )}
                    {marketingContent && !generatedImage && (
                      <button
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50"
                      >
                        {isGeneratingImage ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                        {isGeneratingImage ? "Generando..." : "Generar Imagen"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div className="flex flex-col gap-3">
                    {marketingContent ? (
                      <div className="flex-grow overflow-y-auto text-[10px] text-slate-700 font-mono bg-white p-5 rounded-2xl border border-indigo-100 custom-scrollbar max-h-[250px] leading-relaxed">
                        {marketingContent}
                      </div>
                    ) : (
                      <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4 bg-white/50 rounded-2xl border border-dashed border-indigo-200 p-8">
                        <Sparkles className="w-8 h-8 text-indigo-300 mx-auto" />
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Generar Estrategia Viral</p>
                        <button onClick={handleGenerateContent} disabled={isGeneratingContent} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold text-xs disabled:opacity-50 transition-all shadow-lg">
                          {isGeneratingContent ? <Loader2 className="animate-spin w-4 h-4" /> : "Redactar Contenido"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {generatedImage ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-indigo-100 shadow-lg bg-white h-full min-h-[200px]">
                        <img src={generatedImage} alt="IA Visual" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            onClick={() => window.open(generatedImage, '_blank')}
                            className="p-2 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleGenerateImage}
                            className="p-2 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4 bg-indigo-100/30 rounded-2xl border border-dashed border-indigo-200 p-8">
                        <ImageIcon className="w-8 h-8 text-indigo-200 mx-auto" />
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Visual representativo</p>
                      </div>
                    )}
                  </div>
                </div>
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
              {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : saveSuccess ? <BookmarkCheck className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saveSuccess ? "¡Guardado con éxito!" : !hasEnoughBudget && user !== null ? "Saldo Insuficiente" : "Guardar"}
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
