/**
 * Firebase Authentication bootstrap.
 *
 * The SDK is imported lazily so a build without Firebase keys still boots: the
 * login screen shows a configuration notice instead of crashing at module load,
 * and the Firebase chunk is only fetched when someone actually authenticates.
 *
 * Configuration comes from the six web-app values in the Firebase console
 * (Project settings → Your apps → Web app → SDK setup and configuration):
 *
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 *
 * These are public identifiers (they ship in every Firebase web app), so they
 * belong in the client environment. Never put a service-account key here — the
 * backend reads that from FIREBASE_SERVICE_ACCOUNT_JSON / *_FILE.
 */
import type { Auth, GoogleAuthProvider } from "firebase/auth";

function env(key: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export const firebaseConfig = {
  apiKey: env("VITE_FIREBASE_API_KEY"),
  authDomain: env("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: env("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: env("VITE_FIREBASE_APP_ID"),
};

/** Env var names that are still empty — surfaced verbatim in the UI. */
export const missingFirebaseVars = (
  [
    ["VITE_FIREBASE_API_KEY", firebaseConfig.apiKey],
    ["VITE_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
    ["VITE_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
    ["VITE_FIREBASE_APP_ID", firebaseConfig.appId],
  ] as const
)
  .filter(([, value]) => !value)
  .map(([name]) => name);

/**
 * True when the minimum set needed to boot the SDK is present. Storage bucket
 * and messaging sender id are optional for authentication.
 */
export const firebaseConfigured = missingFirebaseVars.length === 0;

let authPromise: Promise<Auth | null> | null = null;

/** The shared Firebase Auth instance, or null when the app is unconfigured. */
export function getFirebaseAuth(): Promise<Auth | null> {
  if (!firebaseConfigured) return Promise.resolve(null);
  if (!authPromise) {
    authPromise = (async () => {
      const [{ initializeApp, getApps }, { getAuth }] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
      ]);
      const app = getApps()[0] ?? initializeApp(firebaseConfig);
      return getAuth(app);
    })();
  }
  return authPromise;
}

/** Google provider with a picker prompt so switching accounts works. */
export async function getGoogleProvider(): Promise<GoogleAuthProvider> {
  const { GoogleAuthProvider } = await import("firebase/auth");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}
