import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize if config is present (allows builds without env vars for pure-local use)
const hasConfig = !!firebaseConfig.apiKey;

const app  = hasConfig ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db   = app ? getFirestore(app) : null;

let _user: User | null = null;
let _authReady = false;
let _authListeners: Array<(user: User | null) => void> = [];
let _uploadTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingState: unknown = null;

if (auth) {
  onAuthStateChanged(auth, (user) => {
    _user = user;
    _authReady = true;
    _authListeners.forEach((fn) => fn(user));
  });
}

export interface CloudUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

function toCloudUser(u: User | null): CloudUser | null {
  if (!u) return null;
  return { displayName: u.displayName, email: u.email, photoURL: u.photoURL };
}

export const CloudSync = {
  isAuthReady: () => _authReady,

  getUser: () => toCloudUser(_user),

  onAuthChange: (cb: (user: CloudUser | null) => void): (() => void) => {
    const wrapped = (u: User | null) => cb(toCloudUser(u));
    _authListeners.push(wrapped);
    return () => { _authListeners = _authListeners.filter((fn) => fn !== wrapped); };
  },

  signIn: async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  },

  signOut: async () => {
    if (!auth) return;
    if (_uploadTimer) { clearTimeout(_uploadTimer); _uploadTimer = null; }
    await firebaseSignOut(auth);
  },

  upload: async (state: unknown) => {
    if (!_user || !db) return;
    await setDoc(doc(db, "users", _user.uid), {
      stateJson: JSON.stringify(state),
      updatedAt: serverTimestamp(),
    });
  },

  uploadDebounced: (state: unknown, delay = 60000) => {
    if (!_user) return;
    _pendingState = state;
    if (_uploadTimer) clearTimeout(_uploadTimer);
    _uploadTimer = setTimeout(() => {
      _pendingState = null;
      CloudSync.upload(state).catch(console.error);
    }, delay);
  },

  flush: () => {
    if (!_pendingState) return;
    const state = _pendingState;
    _pendingState = null;
    if (_uploadTimer) { clearTimeout(_uploadTimer); _uploadTimer = null; }
    CloudSync.upload(state).catch(console.error);
  },

  downloadWithMeta: async (): Promise<{ state: Record<string, unknown> } | null> => {
    if (!_user || !db) return null;
    const snap = await getDoc(doc(db, "users", _user.uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    try {
      const state = data["stateJson"] ? JSON.parse(data["stateJson"] as string) : null;
      return state ? { state } : null;
    } catch {
      return null;
    }
  },

  clearCloud: async () => {
    if (!_user || !db) return;
    await deleteDoc(doc(db, "users", _user.uid));
  },
};

export const isFirebaseConfigured = hasConfig;
