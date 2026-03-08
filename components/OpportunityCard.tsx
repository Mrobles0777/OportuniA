
import React from 'react';
import { BusinessOpportunity } from '../types';
import { TrendingUp, DollarSign, ArrowRight } from 'lucide-react';

interface Props {
  opportunity: BusinessOpportunity;
  onSelect: (opp: BusinessOpportunity) => void;
  currencySymbol: string;
  currencyCode: string;
}

const OpportunityCard: React.FC<Props> = ({ opportunity, onSelect, currencySymbol, currencyCode }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Baja': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Media': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Alta': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="group bg-white rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-indigo-100 border border-slate-100 p-6 transition-all duration-300 flex flex-col h-full active:scale-[0.98]">
      <div className="flex justify-between items-start mb-4 gap-3">
        <h3 className="text-xl font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{opportunity.title}</h3>
        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shrink-0 ${getDifficultyColor(opportunity.difficulty)}`}>
          {opportunity.difficulty}
        </span>
      </div>

      <p className="text-slate-500 text-sm mb-5 line-clamp-2 font-medium leading-relaxed">
        {opportunity.description}
      </p>

      <div className="space-y-3 mb-6 flex-grow">
        <div className="flex items-center px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100/50">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mr-3">
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 leading-none mb-1">Inversión Aproximada</p>
            <p className="text-sm font-black text-slate-700">{currencySymbol}{opportunity.initialInvestment.toLocaleString()} <span className="text-[10px] opacity-60">{currencyCode}</span></p>
          </div>
        </div>

        <div className="flex items-center px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100/50">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mr-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-slate-400 leading-none mb-1">Potencial ROI</p>
            <p className="text-sm font-black text-slate-700 tracking-tight">{opportunity.expectedROI}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2">
          {opportunity.trends?.slice(0, 3).map((trend, i) => (
            <span key={i} className="text-[9px] uppercase tracking-wider bg-indigo-50/50 px-2.5 py-1 rounded-lg text-indigo-600 font-black border border-indigo-100/30">
              #{trend}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSelect(opportunity)}
        className="w-full py-4 px-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn shadow-lg shadow-slate-200 hover:shadow-indigo-200 active:scale-95"
      >
        Analizar Mercado
        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

export default OpportunityCard;
