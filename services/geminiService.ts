
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export type AnalysisType = 'general' | 'products';

export const analyzeOpportunities = async (
  investment: number,
  location: string,
  type: AnalysisType = 'general'
): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("No se encontró la API Key de Gemini. Verifica tu archivo .env.local");
    throw new Error("Configuración incompleta: Falta la API Key.");
  }

  // Use new Gemini client with standard environment variable
  const ai = new GoogleGenAI({ apiKey });

  const typeContext = type === 'products'
    ? 'especificamente centradas en la VENTA DE PRODUCTOS (e-commerce, dropshipping, venta directa, Amazon, TikTok Shop, productos fisicos o digitales)'
    : 'de negocio generales (servicios, con modelos de suscripción, franquicias modernas, startups, o modelos hibridos)';

  const prompt = `Analiza oportunidades de negocio reales y actualizadas a la fecha actual (9 de febrero de 2026) para una inversion inicial de ${investment} en la moneda local de ${location}. 
  El analisis debe enfocarse en oportunidades ${typeContext}.
  
  PASOS IMPORTANTES:
  1. Identifica la moneda oficial de ${location} en febrero de 2026.
  2. Considera tendencias virales de este año (2026) en plataformas como TikTok, Instagram, Threads, LinkedIn y nuevas redes emergentes.
  3. Genera EXACTAMENTE 10 oportunidades detalladas.
  4. Para cada oportunidad, incluye un "referenceUrl" que sea un enlace real de ejemplo (producto exitoso o noticia de 2026).
  5. PARA CADA OPORTUNIDAD, incluye EXACTAMENTE 3 referencias de PROVEEDORES MAYORISTAS (Wholesale). Pueden ser internacionales (Alibaba, 1688, Made-in-China, etc.) o locales. 
     Para cada proveedor, indica: nombre, URL del sitio web y días estimados de envío a ${location}.
  6. Devuelve el codigo ISO de la moneda y su simbolo actual.
  
  Devuelve un JSON estrictamente siguiendo este esquema:
  {
    "marketOverview": "string",
    "currencySymbol": "string",
    "currencyCode": "string",
    "opportunities": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "initialInvestment": number,
        "expectedROI": "string",
        "difficulty": "Baja" | "Media" | "Alta",
        "trends": ["string"],
        "pros": ["string"],
        "cons": ["string"],
        "marketingStrategy": "string",
        "referenceUrl": "string",
        "suppliers": [
          { "name": "string", "url": "string", "shippingDays": "string" }
        ]
      }
    ]
  }

  Responde ÚNICAMENTE con el objeto JSON válido.`;

  try {
    // Use gemini-2.5-flash as requested
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : responseText;

    // Extract response text property directly and parse
    const result = JSON.parse(cleanJson) as AnalysisResult;
    // Extract URLs from groundingChunks as required when using googleSearch
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Fuente de mercado 2026',
      uri: chunk.web?.uri || '#'
    })) || [];

    return { ...result, sources };
  } catch (error: any) {
    console.error("Error en analyzeOpportunities:", error);
    if (error.status === 429 || error.message?.includes("quota")) {
      throw new Error("Cuota agotada en Gemini. Intenta de nuevo en un momento.");
    }
    throw error;
  }
};

export const generateMarketingContent = async (title: string, description: string, strategy: string): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Genera un guion de ventas persuasivo y 3 copys para redes sociales optimizados para el mercado de febrero de 2026 para el siguiente producto de negocio:
    Título: ${title}
    Descripción: ${description}
    Estrategia sugerida: ${strategy}
    
    El tono debe ser innovador y extremadamente atractivo para clientes finales de 2026. Incluye emojis de tendencia y una estructura de alta conversión.`,
  });
  // Use response.text property
  return response.text || '';
};

export const generateImagePromptFromScript = async (script: string): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Basado en el siguiente guion de ventas de 2026, crea un PROMPT de generación de imagen (estilo Midjourney/DALL-E) que represente visualmente la esencia de esta oferta comercial moderna. 
    REGLA: Responde ÚNICAMENTE con el prompt en INGLÉS para mejor compatibilidad con modelos de imagen, debe ser descriptivo, detallando estilo 4k, iluminación cinematográfica y composición premium. Sin texto.
    
    GUION:
    ${script}
    
    PROMPT:`,
  });
  return response.text?.trim() || '';
};
