/// <reference lib="deno.ns" />
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')?.trim()
const OPENAI_MODEL = "gpt-4o-mini"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    const start = Date.now();
    console.log(`[${start}] Nueva petición recibida (OpenAI)`);

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

        let body: any
        try {
            body = JSON.parse(bodyText)
        } catch (e: any) {
            console.error("Error al parsear JSON:", e.message)
            return new Response(JSON.stringify({ error: "Invalid JSON", details: e.message }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400
            })
        }

        const { action } = body
        console.log(`[${Date.now() - start}ms] Acción recibida: "${action}"`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s para DALL-E 3 (es lento)

        if (!OPENAI_API_KEY) {
            console.error("ERROR DE CONFIGURACIÓN: OPENAI_API_KEY no está definida en Supabase.");
            return new Response(JSON.stringify({
                error: "Config Error: OPENAI_API_KEY no encontrada.",
                suggestion: "Debes ejecutar 'supabase secrets set OPENAI_API_KEY=tu_clave' en la terminal."
            }), {
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
            const { title } = body

            console.log(`[${Date.now() - start}ms] Generando imagen con DALL-E 3 para: ${title}`);

            try {
                const imgResponse = await fetch(`https://api.openai.com/v1/images/generations`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "dall-e-3",
                        prompt: `A professional, high-quality, photorealistic commercial product or business scene for: "${title}". Modern aesthetic, cinematic lighting, 8k, no text, no words.`,
                        n: 1,
                        size: "1024x1024",
                        quality: "standard"
                    }),
                    signal: controller.signal
                });

                if (!imgResponse.ok) {
                    const errorText = await imgResponse.text();
                    console.error("DALL-E API Error:", errorText);
                    return new Response(JSON.stringify({ error: "Error en DALL-E", details: errorText }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                        status: imgResponse.status
                    });
                }

                const imgData = await imgResponse.json();
                const imageUrl = imgData.data?.[0]?.url;

                return new Response(JSON.stringify({ content: imageUrl }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } catch (err) {
                console.error("Fetch error in DALL-E:", err);
                return new Response(JSON.stringify({ error: "Error de red en DALL-E" }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 500
                });
            }
        } else {
            return new Response(JSON.stringify({ error: "Acción no válida." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400
            })
        }

        console.log(`[${Date.now() - start}ms] Llamando a OpenAI API (${OPENAI_MODEL})...`);

        try {
            const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: OPENAI_MODEL,
                    messages: [
                        { role: "system", content: "Eres un experto en análisis de mercados y negocios para 2026." },
                        { role: "user", content: prompt }
                    ],
                    response_format: action === 'analyze' ? { type: "json_object" } : undefined
                }),
                signal: controller.signal
            })

            clearTimeout(timeoutId);

            console.log(`[${Date.now() - start}ms] OpenAI Status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                let errorDetails = errorText;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorDetails = errorJson.error?.message || errorText;
                } catch (e) {
                    // Not JSON, keep as text
                }

                console.error(`[${Date.now() - start}ms] OpenAI API Error (${response.status}):`, errorText);
                return new Response(JSON.stringify({
                    error: `OpenAI API Error: ${response.status}`,
                    details: errorDetails,
                    raw: errorText
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: response.status
                })
            }

            const data = await response.json()
            const responseText = data.choices?.[0]?.message?.content || ""
            console.log(`[${Date.now() - start}ms] OpenAI API respondió correctamente`);

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
        console.error(`[${Date.now() - start}ms] Internal Server Error:`, error);
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack,
            context: "Global catch in Edge Function"
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        })
    }
})
