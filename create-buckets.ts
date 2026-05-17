import { supabase } from './supabase.ts';

async function createBucket() {
  const { data, error } = await supabase.storage.createBucket('app_state', {
    public: true,
    allowedMimeTypes: ['application/json'],
    fileSizeLimit: 10485760
  });
  console.log('create bucket:', data, error);
}
createBucket();
