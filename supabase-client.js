const supabaseClient = supabase.createClient(
  'https://YOUR-PROJECT-URL.supabase.co',
  'YOUR-PUBLISHABLE-KEY',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
