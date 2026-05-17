import { supabase } from './supabase.js';

async function check() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  console.log('products:', data, error);
}
check();
