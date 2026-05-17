import { supabase } from './supabase.ts';

async function check() {
  const { data, error } = await supabase.rpc('get_tables');
  console.log('tables:', data, error);
}
check();
