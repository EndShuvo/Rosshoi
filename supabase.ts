import { createClient } from '@supabase/supabase-js';
import { setNetworkError } from './networkState';

const supabaseUrl = 'https://vgqxybiyzbeqqzavozgj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZncXh5Yml5emJlcXF6YXZvemdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDc1OTQsImV4cCI6MjA4ODYyMzU5NH0.MrUHrQQFuFEORTQHIsW2JIKbhdSCnvHYpN-Uy9lVlP4';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url, init) => fetch(url, init).catch(err => {
      const errStr = err?.message?.toLowerCase() || '';
      if (errStr.includes('failed to fetch') || errStr.includes('networkerror') || errStr.includes('fetch')) {
        setNetworkError(true);
        console.warn('Supabase fetch failed (network error). The app will continue in offline mode.');
      }
      throw err;
    })
  }
});
