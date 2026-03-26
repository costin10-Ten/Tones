import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.SUPABASE_URL;
const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Server-only client — uses service_role key, bypasses RLS safely in API routes
// keepalive reduces TCP handshake overhead in serverless cold-start environments
export const supabase = createClient(url, serviceKey, {
  global: {
    fetch: (input, init) => fetch(input, { ...init, keepalive: true }),
  },
});
