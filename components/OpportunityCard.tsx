
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
      case 'Baja': return 'bg-green-100 text-green-700';
      case 'Media': return 'bg-yellow-100 text-yellow-700';
      case 'Alta': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-slate-800 leading-tight">{opportunity.title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(opportunity.difficulty)}`}>
          {opportunity.difficulty}
        </span>
      </div>
      
      <p className="text-slate-600 text-sm mb-4 line-clamp-3">
        {opportunity.description}
      </p>

      <div className="space-y-3 mb-6 flex-grow">
        <div className="flex items-center text-sm font-medium text-slate-700">
          <DollarSign className="w-4 h-4 mr-2 text-indigo-600" />
          <span>Inversión: {currencySymbol}{opportunity.initialInvestment.toLocaleString()} {currencyCode}</span>
        </div>
        <div className="flex items-center text-sm font-medium text-slate-700">
          <TrendingUp className="w-4 h-4 mr-2 text-indigo-600" />
          <span>ROI: {opportunity.expectedROI}</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {opportunity.trends.slice(0, 3).map((trend, i) => (
            <span key={i} className="text-[10px] uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">
              #{trend}
            </span>
          ))}
        </div>
      </div>

      <button 
        onClick={() => onSelect(opportunity)}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center group"
      >
        Ver Análisis Detallado
        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

export default OpportunityCard;
