import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer, disableNetwork, memoryLocalCache } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore without persistence to reduce background write attempts during quota exhaustion
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Global flag to track quota status
let isQuotaExceeded = false;

// Test connection
export async function testFirebaseConnection() {
  if (isQuotaExceeded) return;
  try {
    await getDocFromServer(doc(db, 'app_state', 'connection_test'));
  } catch (error) {
    const errStr = (error instanceof Error ? error.message : String(error)).toLowerCase();
    if (errStr.includes('resource-exhausted') || errStr.includes('quota')) {
      handleFirestoreError(error, OperationType.GET, 'app_state/connection_test');
    } else if (errStr.includes('the client is offline') || errStr.includes('unavailable')) {
      console.error("Please check your Firebase configuration or network connection. An ad blocker or firewall might be blocking the connection to Firestore.");
    }
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check for quota exceeded error
  if (errorMessage.includes('resource-exhausted') || errorMessage.includes('quota')) {
    if (!isQuotaExceeded) {
      isQuotaExceeded = true;
      // Disable network to stop retries and noise
      disableNetwork(db).catch(e => console.error('Failed to disable Firestore network:', e));
      
      const quotaMsg = 'Server is currently at full capacity (Daily Limit Reached). Some features like commenting or placing new cloud-synced orders might be temporarily unavailable. Please try again in a few hours. Your local data is still safe.';
      console.error('Firestore Quota Exceeded:', quotaMsg);
      
      // Show a user-friendly alert if in browser
      if (typeof window !== 'undefined') {
        // Use a debounced alert to avoid multiple popups
        if (!(window as any)._quotaAlertShown) {
          (window as any)._quotaAlertShown = true;
          alert(quotaMsg);
          setTimeout(() => { (window as any)._quotaAlertShown = false; }, 60000); // Reset after 1 minute
        }
      }
    }
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function getIsQuotaExceeded() {
  return isQuotaExceeded;
}

