
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = "gemini-3-flash-preview"

serve(async (req) => {
    // Manejo de CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        const body = await req.json()
        const { action } = body

        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY no configurado en los secretos de Supabase.")
        }

        let prompt = ""

        if (action === 'analyze') {
            const { investment, location, type } = body
            const typeContext = type === 'products'
                ? 'especificamente centradas en la VENTA DE PRODUCTOS (e-commerce, dropshipping, venta directa, Amazon, TikTok Shop, productos fisicos o digitales)'
                : 'de negocio generales (servicios, con modelos de suscripción, franquicias modernas, startups, o modelos hibridos)';

            prompt = `Analiza oportunidades de negocio reales y actualizadas a la fecha actual (febrero de 2026) para una inversion inicial de ${investment} en la moneda local de ${location}. 
      El analisis debe enfocarse en oportunidades ${typeContext}.
      
      PASOS IMPORTANTES:
      1. Identifica la moneda oficial de ${location}.
      2. Considera tendencias virales de este año (2026).
      3. Genera EXACTAMENTE 10 oportunidades detalladas.
      
      Devuelve un JSON siguiendo este esquema:
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
            "referenceUrl": "string"
          }
        ]
      }
      Responde SOLO el JSON.`;
        } else if (action === 'marketing') {
            const { title, description, strategy } = body
            prompt = `Genera un guion de ventas persuasivo y 3 copys para redes sociales de febrero de 2026:
      Título: ${title}
      Descripción: ${description}
      Estrategia: ${strategy}`
        } else if (action === 'image-prompt') {
            const { script } = body
            prompt = `Crea un PROMPT de generación de imagen en INGLÉS para este guion: ${script}. Responde solo el prompt.`
        } else {
            throw new Error("Acción no válida.")
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        })

        const data = await response.json()
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

        // Devolver JSON directamente si es el caso de análisis
        if (action === 'analyze') {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)
            return new Response(jsonMatch ? jsonMatch[0] : responseText, {
                headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
            })
        }

        // Para marketing e imagen, simplemente devolver el texto
        return new Response(JSON.stringify({ content: responseText }), {
            headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
            status: 500,
        })
    }
})
