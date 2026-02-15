const SUPABASE_URL = "https://dvwtiizinaxtfbmeniep.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2d3RpaXppbmF4dGZibWVuaWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Nzc2MzIsImV4cCI6MjA4NjI1MzYzMn0.KMehu5tOvpAFWl507lxqaXKeSg-bb0HW2cFFAnAhGQs";

import fs from 'fs';

async function testFunction() {
    console.log("Testing Edge Function...");
    const start = Date.now();
    const result = { success: false, data: null, error: null, duration: 0, status: 0 };

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-opportunities`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action: "analyze",
                investment: 1000,
                location: "Chile",
                type: "general"
            })
        });

        result.duration = Date.now() - start;
        result.status = response.status;
        console.log(`Response received in ${result.duration}ms`);

        if (!response.ok) {
            const errorText = await response.text();
            result.error = errorText;
            console.error("Error body:", errorText);
        } else {
            const data = await response.json();
            result.success = true;
            result.data = data;
            console.log("Success!");
        }

    } catch (error) {
        console.error("Fetch error:", error);
        result.error = error.message;
    }

    fs.writeFileSync('test-result.json', JSON.stringify(result, null, 2));
}

testFunction();
