import { supabase } from './supabase';
import * as idb from 'idb-keyval';
import { getNetworkError, setNetworkError } from './networkState';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getIsQuotaExceeded } from './firebase';

let tableExists = true;

export const resetNetworkError = () => {
  setNetworkError(false);
};

export const supabaseStorage = {
  async get(key: string) {
    try {
      // 1. Try Supabase first if no known network error
      if (tableExists && !getNetworkError()) {
        const { data, error } = await supabase
          .from('app_state')
          .select('value')
          .eq('key', key)
          .single();
        
        if (!error && data) {
          return data.value;
        }

        if (error) {
          const errStr = (error?.message || error?.toString() || '').toLowerCase();
          if (errStr.includes('failed to fetch') || errStr.includes('networkerror') || errStr.includes('load failed') || errStr.includes('fetch') || errStr.includes('connection') || errStr.includes('timeout')) {
            setNetworkError(true);
            console.warn(`Network error connecting to Supabase. Falling back to Firebase for ${key}.`);
          } else if (error.code === 'PGRST205' || errStr.includes('could not find the table')) {
            tableExists = false;
            console.warn(`Supabase table missing, falling back to Firebase for ${key}`);
          } else {
            console.warn(`Error fetching ${key} from Supabase:`, error?.message || errStr);
          }
        }
      }

      // 2. Fallback to Firebase
      try {
        const docRef = doc(db, 'app_state', key);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.value) {
            try {
              return JSON.parse(data.value);
            } catch (parseError) {
              console.warn(`Error parsing Firebase data for ${key}, returning raw value:`, parseError);
              return data.value;
            }
          }
        }
      } catch (fbError) {
        console.warn(`Error fetching ${key} from Firebase, falling back to IndexedDB:`, fbError);
      }

      // 3. Final fallback to IndexedDB
      return await idb.get(key);
      
    } catch (e: any) {
      console.error(`Failed to get ${key}:`, e);
      return await idb.get(key);
    }
  },

  async set(key: string, value: any, localOnly: boolean = false) {
    try {
      // 1. Always save to IDB as local backup
      await idb.set(key, value);

      if (localOnly) return;

      // 2. Save to Firebase (Dual Sync & Offline Persistence)
      if (!getIsQuotaExceeded()) {
        try {
          const docRef = doc(db, 'app_state', key);
          // Stringify value for Firebase to avoid nested array/object limitations
          const stringifiedValue = JSON.stringify(value);
          // Firestore document limit is 1MB. Use a conservative limit of 900KB.
          if (stringifiedValue.length > 900000) {
            console.warn(`Data for ${key} is too large for Firebase (${stringifiedValue.length} bytes). Skipping Firebase save.`);
          } else {
            await setDoc(docRef, { value: stringifiedValue });
          }
        } catch (fbError) {
          console.error(`Error saving ${key} to Firebase:`, fbError);
          // If we get a quota error here, it will be caught by the global handler if we call it,
          // but setDoc doesn't automatically call our handler.
          const errStr = (fbError instanceof Error ? fbError.message : String(fbError)).toLowerCase();
          if (errStr.includes('resource-exhausted') || errStr.includes('quota')) {
            // This will trigger the global flag via handleFirestoreError if we were to call it
            // For now, let's just log it and rely on the next operation to trigger the flag
          }
        }
      } else {
        console.warn(`Skipping Firebase save for ${key} due to quota exhaustion.`);
      }

      // 3. Save to Supabase
      if (!tableExists || getNetworkError()) return;

      const { error } = await supabase
        .from('app_state')
        .upsert({ key, value }, { onConflict: 'key' });
      
      if (error) {
        const errStr = (error?.message || error?.toString() || '').toLowerCase();
        if (errStr.includes('failed to fetch') || errStr.includes('networkerror') || errStr.includes('load failed') || errStr.includes('fetch') || errStr.includes('connection') || errStr.includes('timeout')) {
          setNetworkError(true);
          console.warn(`Network error connecting to Supabase. Data saved to Firebase & IndexedDB.`);
          return;
        }
        if (error.code === 'PGRST205' || errStr.includes('could not find the table')) {
          tableExists = false;
          console.warn(`Supabase table missing, data saved to Firebase & IndexedDB for ${key}`);
          return;
        }
        console.error(`Error saving ${key} to Supabase:`, error?.message || errStr);
      }
    } catch (e: any) {
      console.error(`Error saving ${key}:\n`, e);
    }
  },

  async initialize() {
    try {
      if (getNetworkError()) return false;
      
      const { data, error } = await supabase.from('app_state').select('key').limit(1);
      if (error) {
        const errStr = (error?.message || error?.toString() || '').toLowerCase();
        if (errStr.includes('failed to fetch') || errStr.includes('networkerror') || errStr.includes('load failed') || errStr.includes('fetch') || errStr.includes('connection') || errStr.includes('timeout')) {
          setNetworkError(true);
          console.warn('Network error connecting to Supabase. Using Firebase/IndexedDB.');
          return false;
        }
        if (error.code === 'PGRST205' || errStr.includes('could not find the table')) {
          tableExists = false;
          return false;
        }
        throw error;
      }
      tableExists = true;
      setNetworkError(false);
      return true;
    } catch (e: any) {
      const errorStr = (e?.message || e?.toString() || '').toLowerCase();
      if (errorStr.includes('failed to fetch') || errorStr.includes('networkerror') || errorStr.includes('load failed') || errorStr.includes('fetch') || errorStr.includes('connection') || errorStr.includes('timeout')) {
        setNetworkError(true);
        console.warn('Network error connecting to Supabase. Using Firebase/IndexedDB.');
      } else {
        console.warn('Supabase initialization failed:', e?.message || e);
      }
      return false;
    }
  }
};
