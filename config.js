// config.js
export const SUPABASE_URL = 'https://oamdsemuirmckugyibdd.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hbWRzZW11aXJtY2t1Z3lpYmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzA4MzQsImV4cCI6MjA2NzgwNjgzNH0.e_gPRBh7A87PnWTeDFCNIJUF4qwWFX4BtXUEx22490k';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 