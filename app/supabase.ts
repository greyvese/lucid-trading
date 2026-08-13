import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zenxogxwwzdteiohakod.supabase.co";
const supabasePublishableKey = "sb_publishable_TSWHgVLpPTRNAzFhCqdbjQ_gKxgjO-S";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
