
import { supabase } from "./supabaseService";
import { AnalysisResult } from "../types";

export type AnalysisType = 'general' | 'products';

export const analyzeOpportunities = async (
  investment: number,
  location: string,
  type: AnalysisType = 'general'
): Promise<AnalysisResult> => {
  const { data, error } = await supabase.functions.invoke('analyze-opportunities', {
    body: { action: 'analyze', investment, location, type }
  });

  if (error) {
    console.error("Error en Edge Function (analyze):", error);
    if (error.status === 429) {
      throw new Error("Cuota agotada en Gemini. Intenta de nuevo en un momento.");
    }
    throw new Error(error.message || "Error al analizar oportunidades.");
  }

  return { ...data, sources: [] }; // Sources se manejarán internamente si se vuelve a activar googleSearch
};

export const generateMarketingContent = async (title: string, description: string, strategy: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('analyze-opportunities', {
    body: { action: 'marketing', title, description, strategy }
  });

  if (error) throw error;
  return data.content || '';
};

export const generateImagePromptFromScript = async (script: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('analyze-opportunities', {
    body: { action: 'image-prompt', script }
  });

  if (error) throw error;
  return data.content?.trim() || '';
};
