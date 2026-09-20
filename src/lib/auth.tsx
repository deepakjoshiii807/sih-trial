/**
 * Authentication context — Firebase Authentication is the single source of
 * identity for the app (replacing the previous Django JWT flow).
 *
 *   Email + password  → createUserWithEmailAndPassword / signInWithEmailAndPassword
 *   Google            → signInWithPopup, falling back to signInWithRedirect
 *   Session           → onAuthStateChanged (Firebase restores it, incl. refresh)
 *   API calls         → Authorization: Bearer <Firebase ID token>
 *
 * The four platform roles (student / academician / industry / institution_admin)
 * are not a Firebase concept, so the role is resolved in this order:
 *
 *   1. a `role` custom claim on the ID token (set server-side via Admin SDK),
 *   2. GET /auth/me — the Django row linked by firebase_uid,
 *   3. a local cache keyed by uid (keeps routing working with no API running),
 *   4. otherwise null → the UI asks the user to pick a profile once.
 *
 * Signing in never fails just because the Django API is unreachable: the role
 * cache keeps the workspace usable while the backend is offline.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  apiClient,
  apiErrorMessage,
  setAccessTokenProvider,
} from "./api-client";
import { firebaseConfigured, getFirebaseAuth, getGoogleProvider } from "./firebase";

/** Role values exactly as the Django backend stores them on User.role. */
export type ApiRole = "student" | "industry" | "academician" | "institution_admin";

export interface AuthUser {
  /** Firebase uid — stable identity across sessions. */
  uid: string;
  /** Django row id once the user has been linked server-side (null otherwise). */
  id: number | null;
  email: string;
  name: string;
  initials: string;
  phone: string;
  is_verified: boolean;
  picture: string | null;
  /** null until a profile has been chosen (or resolved from the API/claims). */
  role: ApiRole | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  role: ApiRole;
  phone?: string;
}

export interface AuthContextValue {
  /** True until Firebase has reported the initial session state. */
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  /** True when Firebase keys are absent — sign-in is unavailable until they are set. */
  isConfigured: boolean;
  /** Authenticated, but no role resolved yet → the UI asks for a profile once. */
  needsRole: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signInWithGoogle: () => Promise<void>;
  signUp: (input: SignUpInput) => Promise<AuthUser>;
  /** Attach a role to an existing session (Google sign-in / unresolved users). */
  completeProfile: (role: ApiRole, extra?: { name?: string; phone?: string }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_CACHE_PREFIX = "l2l.role.";

function readCachedRole(uid: string): ApiRole | null {
  try {
    const value = localStorage.getItem(`${ROLE_CACHE_PREFIX}${uid}`);
    return (value as ApiRole) || null;
  } catch {
    return null;
  }
}

function writeCachedRole(uid: string, role: ApiRole): void {
  try {
    localStorage.setItem(`${ROLE_CACHE_PREFIX}${uid}`, role);
  } catch {
    /* storage unavailable — role simply re-resolves from the API next time */
  }
}

function clearCachedRole(uid: string): void {
  try {
    localStorage.removeItem(`${ROLE_CACHE_PREFIX}${uid}`);
  } catch {
    /* noop */
  }
}

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email.split("@")[0] || "?";
  const parts = source.replace(/[._-]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

interface MeResponse {
  id: number;
  email: string;
  name: string;
  initials?: string;
  role: ApiRole | null;
  is_verified?: boolean;
  phone?: string;
}

/** GET /auth/me with the Firebase ID token. Returns null when unreachable. */
async function fetchMe(): Promise<MeResponse | null> {
  try {
    const { data } = await apiClient.get<MeResponse>("/auth/me");
    return data;
  } catch {
    return null;
  }
}

/** Best-effort POST /auth/sync — never blocks sign-in when the API is down. */
async function syncProfile(payload: {
  role?: ApiRole;
  name?: string;
  phone?: string;
}): Promise<MeResponse | null> {
  try {
    const { data } = await apiClient.post<MeResponse>("/auth/sync", payload);
    return data;
  } catch {
    return null;
  }
}

/** Build the app user from a Firebase session + whatever the API/claims knew. */
async function buildUser(fbUser: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }>;
}): Promise<AuthUser> {
  const email = fbUser.email ?? "";
  const name = fbUser.displayName ?? "";
  const base = {
    uid: fbUser.uid,
    email,
    name: name || email.split("@")[0] || "User",
    initials: initialsOf(name, email),
    phone: "",
    is_verified: false,
    picture: fbUser.photoURL,
  };

  // 1. custom claim (authoritative when an Admin SDK sets it)
  try {
    const { claims } = await fbUser.getIdTokenResult();
    const claimRole = typeof claims.role === "string" ? (claims.role as ApiRole) : null;
    if (claimRole) return { ...base, id: null, role: claimRole };
  } catch {
    /* ignore — fall through to the API */
  }

  // 2. the Django row linked by firebase_uid / email
  const me = await fetchMe();
  if (me) {
    const role = me.role ?? null;
    if (role) writeCachedRole(fbUser.uid, role);
    return {
      uid: fbUser.uid,
      id: me.id,
      email: me.email || email,
      name: me.name || base.name,
      initials: me.initials || initialsOf(me.name || name, email),
      phone: me.phone ?? "",
      is_verified: !!me.is_verified,
      picture: fbUser.photoURL,
      role,
    };
  }

  // 3. local cache — keeps routing intact while the API is unavailable
  return { ...base, id: null, role: readCachedRole(fbUser.uid) };
}

/*
 * The axios client asks this for a bearer token on every request, and Firebase
 * refreshes the ID token for us (cached until it is close to expiry).
 */
setAccessTokenProvider(async () => {
  const auth = await getFirebaseAuth();
  const current = auth?.currentUser;
  if (!current) return null;
  try {
    return await current.getIdToken();
  } catch {
    return null;
  }
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Complete a pending Google redirect sign-in and subscribe to session changes.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const auth = await getFirebaseAuth();
      if (!auth) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      const { getRedirectResult, onAuthStateChanged } = await import("firebase/auth");
      try {
        await getRedirectResult(auth);
      } catch {
        /* a failed redirect completion simply leaves the visitor signed out */
      }
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (!fbUser) {
          if (!cancelled) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
        const next = await buildUser(fbUser);
        if (!cancelled) {
          setUser(next);
          setIsLoading(false);
        }
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);



  const adopt = useCallback((next: AuthUser): AuthUser => {
    setUser(next);
    return next;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const auth = await getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured for this deployment.");
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      return adopt(await buildUser(credential.user));
    },
    [adopt],
  );

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    const auth = await getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured for this deployment.");
    const { signInWithPopup, signInWithRedirect } = await import("firebase/auth");
    const provider = await getGoogleProvider();
    try {
      const credential = await signInWithPopup(auth, provider);
      adopt(await buildUser(credential.user));
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      // Popups are blocked in embedded frames — fall back to a full-page redirect.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/cancelled-popup-request"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  }, [adopt]);

  const completeProfile = useCallback(
    async (role: ApiRole, extra?: { name?: string; phone?: string }): Promise<AuthUser> => {
      const auth = await getFirebaseAuth();
      const current = auth?.currentUser;
      if (!current) throw new Error("You must be signed in to choose a profile.");
      const { updateProfile } = await import("firebase/auth");
      if (extra?.name && extra.name !== current.displayName) {
        await updateProfile(current, { displayName: extra.name });
      }
      writeCachedRole(current.uid, role);
      const me = await syncProfile({ role, name: extra?.name, phone: extra?.phone });
      const next = await buildUser(current);
      return adopt(
        me?.role ? { ...next, role: me.role, id: me.id } : { ...next, role },
      );
    },
    [adopt],
  );

  const signUp = useCallback(
    async (input: SignUpInput): Promise<AuthUser> => {
      const auth = await getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured for this deployment.");
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const credential = await createUserWithEmailAndPassword(
        auth,
        input.email.trim().toLowerCase(),
        input.password,
      );
      const name = input.name.trim();
      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }
      writeCachedRole(credential.user.uid, input.role);
      const me = await syncProfile({
        role: input.role,
        name,
        phone: input.phone?.trim() || undefined,
      });
      const next = await buildUser(credential.user);
      return adopt({
        ...next,
        role: input.role,
        name: name || next.name,
        initials: initialsOf(name, next.email),
        phone: input.phone?.trim() ?? next.phone,
        id: me?.id ?? next.id,
      });
    },
    [adopt],
  );

  const signOut = useCallback(async (): Promise<void> => {
    const auth = await getFirebaseAuth();
    try {
      if (auth) {
        const uid = auth.currentUser?.uid;
        await auth.signOut();
        if (uid) clearCachedRole(uid);
      }
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: !!user,
      user,
      isConfigured: firebaseConfigured,
      needsRole: !!user && !user.role,
      signIn,
      signInWithGoogle,
      signUp,
      completeProfile,
      signOut,
    }),
    [isLoading, user, signIn, signInWithGoogle, signUp, completeProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return ctx;
}

/** Firebase error codes → messages a student can act on. */
const FIREBASE_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-email": "Enter your email address.",
  "auth/missing-password": "Enter your password.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/user-not-found": "No account found for that email. Create one instead.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/invalid-login-credentials": "Email or password is incorrect.",
  "auth/email-already-in-use": "An account with this email already exists. Sign in instead.",
  "auth/weak-password": "Use at least 8 characters with a mix of letters and numbers.",
  "auth/user-disabled": "This account has been disabled. Contact your institution admin.",
  "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/cancelled-popup-request": "Google sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and retry.",
  "auth/unauthorized-domain":
    "This domain is not authorised in Firebase. Add it under Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed":
    "That sign-in method is disabled in the Firebase console (Authentication → Sign-in method).",
  "auth/requires-recent-login": "Please sign in again to continue.",
  "auth/internal-error": "Firebase could not complete the request. Try again.",
};

/** Message for either a Firebase auth error or an API error. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (typeof code === "string" && code.startsWith("auth/")) {
    return FIREBASE_MESSAGES[code] ?? "Sign-in failed. Please try again.";
  }
  if (err instanceof Error && err.message === "Firebase is not configured for this deployment.") {
    return err.message;
  }
  return apiErrorMessage(err);
}

export { firebaseConfigured, missingFirebaseVars } from "./firebase";
