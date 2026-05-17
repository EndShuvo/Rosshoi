import { supabase } from './supabase.ts';

async function createTable() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      create table if not exists app_state (
        key text primary key,
        value jsonb
      );
    `
  });
  console.log('create table:', data, error);
}
createTable();
