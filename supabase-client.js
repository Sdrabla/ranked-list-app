const supabaseClient = supabase.createClient(
  'https://bomoephlfzmztnvqhqct.supabase.co',
  'sb_publishable_NoVkfsKLnGX2_j0JFr0dZw_boAI2tVp',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
