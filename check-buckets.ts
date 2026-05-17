import { supabase } from './supabase.ts';

async function check() {
  const { data, error } = await supabase.storage.listBuckets();
  console.log('buckets:', data, error);
}
check();
