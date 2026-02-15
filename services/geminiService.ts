
import { supabase } from "./supabaseService";
import { AnalysisResult } from "../types";

export type AnalysisType = 'general' | 'products';

export const analyzeOpportunities = async (
  investment: number,
  location: string,
  type: AnalysisType = 'general'
): Promise<AnalysisResult> => {
  console.log("Iniciando análisis con params:", { investment, location, type });

  // Timeout de cliente de 30 segundos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const { data, error } = await supabase.functions.invoke('analyze-opportunities', {
      body: { action: 'analyze', investment, location, type }
    });

    clearTimeout(timeoutId);
    console.log("Respuesta de Edge Function:", { data, error });

    if (error) {
      console.error("Error en Edge Function (analyze):", error);

      // Si error.context?.status existe, es un error de red o de la función
      const status = error.status || (error as any).context?.status;

      if (status === 429) {
        throw new Error("Cuota agotada en Gemini. Intenta de nuevo en un momento.");
      }

      if (status === 405) {
        throw new Error("Error interno: Método no permitido.");
      }

      if (error.message === 'Failed to fetch') {
        throw new Error("No se pudo conectar con la función de Supabase. Verifica tu conexión a internet o el estado del servicio.");
      }

      throw new Error(error.message || "Error al analizar oportunidades.");
    }

    if (!data || !data.opportunities) {
      console.error("Respuesta inválida de Edge Function:", data);
      throw new Error("La IA no devolvió oportunidades válidas. Intenta de nuevo.");
    }

    return { ...data, sources: [] }; // Sources se manejarán internamente si se vuelve a activar googleSearch

  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error("El análisis tardó demasiado. Por favor verifica tu conexión e intenta de nuevo.");
    }
    throw err;
  }
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
