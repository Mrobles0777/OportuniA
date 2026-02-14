
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dvwtiizinaxtfbmeniep.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2d3RpaXppbmF4dGZibWVuaWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Nzc2MzIsImV4cCI6MjA4NjI1MzYzMn0.KMehu5tOvpAFWl507lxqaXKeSg-bb0HW2cFFAnAhGQs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    console.log("Testing Supabase connection...");
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) {
        console.error("Supabase Error:", error);
    } else {
        console.log("Supabase Connection Successful! Found", data, "profiles (or connection confirmed).");
    }
}

test();
