
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  availableInvestment: number;
  avatarUrl?: string;
  createdAt: string;
}

export interface Supplier {
  name: string;
  url: string;
  shippingDays: string;
}

export interface BusinessOpportunity {
  id: string;
  title: string;
  description: string;
  initialInvestment: number;
  expectedROI: string;
  difficulty: 'Baja' | 'Media' | 'Alta';
  trends: string[];
  pros: string[];
  cons: string[];
  marketingStrategy: string;
  referenceUrl: string;
  suppliers: Supplier[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AnalysisResult {
  opportunities: BusinessOpportunity[];
  marketOverview: string;
  sources: GroundingSource[];
  currencySymbol: string;
  currencyCode: string;
}
