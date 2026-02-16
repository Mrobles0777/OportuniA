
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

    if (error) {
      console.error("Error detallado de Edge Function:", error);

      let errorMessage = "Ocurrió un error al analizar las oportunidades.";

      // Si el error es una instancia de error de Supabase, intentamos obtener más contexto
      if (error instanceof Error) {
        errorMessage = error.message;

        if (errorMessage.includes("Edge Function returned a non-2xx status code")) {
          const status = (error as any).status || (error as any).context?.status;
          console.log("Status detectado:", status);

          if (status === 429) {
            errorMessage = "Límite de OpenAI alcanzado (429). Verifica tu saldo o cuota.";
          } else if (status === 401) {
            errorMessage = "Error de API Key (401). Verifica que la clave de OpenAI sea correcta.";
          } else if (status === 500) {
            errorMessage = "Error Interno (500). Es posible que los 'secrets' no estén bien configurados o la IA falló.";
          } else if (status) {
            errorMessage = `Error del servidor (${status}). Por favor, revisa los logs de Supabase.`;
          }
        }
      }

      throw new Error(errorMessage);
    }

    if (!data || !data.opportunities) {
      console.error("Respuesta inválida de Edge Function:", data);
      throw new Error("La IA no devolvió oportunidades válidas. Intenta de nuevo.");
    }

    // Asegurar que todos los campos requeridos por el frontend existan para evitar crashes en React
    const sanitizedOpportunities = data.opportunities.map((opp: any) => ({
      ...opp,
      trends: opp.trends || [],
      pros: opp.pros || [],
      cons: opp.cons || [],
      suppliers: opp.suppliers || []
    }));

    return { ...data, opportunities: sanitizedOpportunities, sources: [] }; // Sources se manejarán internamente si se vuelve a activar googleSearch

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

  if (error) {
    const status = error.status || (error as any).context?.status;
    if (status === 429) throw new Error("Límite de OpenAI alcanzado. Por favor, reintenta en un momento.");
    throw error;
  }
  return data.content || '';
};

export const generateImagePromptFromScript = async (title: string, context: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('analyze-opportunities', {
    body: { action: 'image-prompt', title, context }
  });

  if (error) {
    const status = error.status || (error as any).context?.status;
    if (status === 429) throw new Error("Límite de OpenAI alcanzado. No se pudo generar la imagen.");
    throw error;
  }
  return data.content?.trim() || '';
};
