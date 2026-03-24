import { createClient } from '@supabase/supabase-js'

// This creates a Supabase client that bypasses Row Level Security.
// ONLY use this in Server Actions or backend APIs that are protected.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}
