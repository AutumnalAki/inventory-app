import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const getSupabaseServerClient = (): SupabaseClient => {
  if (cachedClient) {
    return cachedClient;
  }

  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const key = serviceRole || anon;
  if (!key) {
    throw new Error(
      "Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY for server actions (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  cachedClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
};
