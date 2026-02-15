import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')?.trim()
const GEMINI_MODEL = "gemini-1.5-flash"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Manejo de CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 405
            })
        }

        const bodyText = await req.text()
        console.log("Body recibido:", bodyText)

        let body
        try {
            body = JSON.parse(bodyText)
        } catch (e) {
            console.error("Error al parsear JSON:", e.message)
            return new Response(JSON.stringify({ error: "Invalid JSON", details: e.message }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400
            })
        }

        const { action } = body
        console.log(`Ejecutando acción: ${action}`);

        if (!GEMINI_API_KEY) {
            console.error("Config Error: GEMINI_API_KEY no encontrado.");
            return new Response(JSON.stringify({ error: "Config Error: GEMINI_API_KEY no encontrado en los secretos de Supabase." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500
            })
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
      Responde SOLO el JSON. No incluyas markdown como \`\`\`json.`;
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
            return new Response(JSON.stringify({ error: "Acción no válida." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400
            })
        }

        console.log("Llamando a Gemini API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        })

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gemini API Error (${response.status}):`, errorText);
            return new Response(JSON.stringify({ error: `Gemini API Error: ${response.status}`, details: errorText }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: response.status
            })
        }

        const data = await response.json()
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

        if (action === 'analyze') {
            // Limpiar posible formato markdown si Gemini lo incluye
            let cleanText = responseText.trim();
            if (cleanText.startsWith("```json")) {
                cleanText = cleanText.substring(7);
            }
            if (cleanText.endsWith("```")) {
                cleanText = cleanText.substring(0, cleanText.length - 3);
            }

            const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
            const resultData = jsonMatch ? jsonMatch[0] : cleanText

            try {
                // Validar que sea un JSON válido antes de enviarlo
                JSON.parse(resultData);
                return new Response(resultData, {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                })
            } catch (e) {
                console.error("Gemini no devolvió un JSON válido:", resultData);
                return new Response(JSON.stringify({
                    error: "Error en el formato de respuesta de la IA",
                    details: "La IA no generó un JSON válido. Intenta de nuevo.",
                    raw: resultData
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 500
                })
            }
        }

        // Para marketing e imagen
        return new Response(JSON.stringify({ content: responseText }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })

    } catch (error) {
        console.error("Internal Server Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        })
    }
})
