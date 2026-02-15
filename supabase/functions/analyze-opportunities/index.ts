// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')?.trim()
const GEMINI_MODEL = "gemini-2.5-flash"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    const start = Date.now();
    console.log(`[${start}] Nueva petición recibida`);

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
        console.log(`[${Date.now() - start}ms] Body recibido:`, bodyText)

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
        console.log(`[${Date.now() - start}ms] Ejecutando acción: ${action}`);

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

            // Prompt optimizado para velocidad y formato JSON estricto
            prompt = `Analiza opciones de inversión de ${investment} en ${location} (${typeContext}).
      
      IMPORTANTE:
      1. Usa la moneda oficial de ${location}.
      2. Basado en tendencias 2026.
      3. Genera 3 oportunidades detalladas.
      
      Devuelve SOLO un JSON válido con este formato (sin markdown):
      {
        "marketOverview": "Resumen breve del mercado (max 2 frases)",
        "currencySymbol": "$",
        "currencyCode": "CODE",
        "opportunities": [
          {
            "id": "1",
            "title": "Titulo",
            "description": "Descripcion detallada",
            "initialInvestment": 1000,
            "expectedROI": "20% anual",
            "difficulty": "Baja",
            "trends": ["Tendencia 1", "Tendencia 2"],
            "pros": ["Pro 1", "Pro 2"],
            "cons": ["Contra 1", "Contra 2"],
            "marketingStrategy": "Estrategia de marketing detallada",
            "referenceUrl": "https://google.com",
            "suppliers": [
              { "name": "Proveedor 1", "url": "https://example.com", "shippingDays": "5-7" }
            ]
          }
        ]
      }`;
        } else if (action === 'marketing') {
            const { title, description, strategy } = body
            prompt = `Genera un guion de ventas corto para: ${title}.`
        } else if (action === 'image-prompt') {
            const { script } = body
            prompt = `Create a short image prompt: ${script}`
        } else {
            return new Response(JSON.stringify({ error: "Acción no válida." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400
            })
        }

        console.log(`[${Date.now() - start}ms] Llamando a Gemini API (${GEMINI_MODEL})...`);

        // Timeout interno para la llamada a la IA
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 40000); // 40s timeout

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                signal: controller.signal
            })

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[${Date.now() - start}ms] Gemini API Error (${response.status}):`, errorText);
                return new Response(JSON.stringify({ error: `Gemini API Error: ${response.status}`, details: errorText }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: response.status
                })
            }

            const data = await response.json()
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
            console.log(`[${Date.now() - start}ms] Gemini API respondió correctamente`);

            if (action === 'analyze') {
                // Limpieza robusta de JSON
                let cleanText = responseText.trim();
                // Eliminar bloques de código markdown si existen
                cleanText = cleanText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");

                // Intentar encontrar el objeto JSON si hay texto alrededor
                const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                const resultData = jsonMatch ? jsonMatch[0] : cleanText;

                try {
                    // Validar
                    JSON.parse(resultData);
                    console.log(`[${Date.now() - start}ms] JSON validado, enviando respuesta`);
                    return new Response(resultData, {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    })
                } catch (e) {
                    console.error(`[${Date.now() - start}ms] Error de formato JSON:`, resultData);
                    return new Response(JSON.stringify({
                        error: "Error en el formato de respuesta de la IA",
                        details: "La IA no generó un JSON válido.",
                        raw: resultData
                    }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                        status: 500
                    })
                }
            }

            return new Response(JSON.stringify({ content: responseText }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        } catch (fetchError) {
            if (fetchError.name === 'AbortError') {
                return new Response(JSON.stringify({ error: "Timeout: La IA tardó demasiado en responder." }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 504
                })
            }
            throw fetchError;
        }

    } catch (error) {
        console.error(`[${Date.now() - start}ms] Internal Server Error:`, error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        })
    }
})
