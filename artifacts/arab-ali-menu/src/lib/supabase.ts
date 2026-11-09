import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yhnbvdjxsqtctjricdte.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlobmJ2ZGp4c3F0Y3RqcmljZHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3ODYxNzAsImV4cCI6MjA5NjM2MjE3MH0.zeNB8JjXUaHP9PoqJQyjCNfvedLDloYmN71JvMBtTA8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
