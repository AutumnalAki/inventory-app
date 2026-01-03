import { createClient } from '@supabase/supabase-js';

// REPLACE THESE STRINGS WITH YOUR ACTUAL KEYS FOR A QUICK TEST
const supabaseUrl = "https://ldzgjbewjjyallbplhsi.supabase.co"; 
const supabaseKey = "sb_publishable_3TQCH8FUuwOHsZrmqGfW1g_JKlMAEW0"; 

export const supabase = createClient(supabaseUrl, supabaseKey);