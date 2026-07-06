import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { clearSession, ensureSchema, getStoredSession, saveSession, type AuthSession } from './db';
import { STARTUP_TIMEOUT_MS, toUserMessage, withTimeout } from './startup';

type AuthContextValue = {
  ready: boolean;
  session: AuthSession | null;
  startupError: string | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        setStartupError(null);
        await withTimeout(ensureSchema(), STARTUP_TIMEOUT_MS, 'Preparing local library');
        const storedSession = await withTimeout(getStoredSession(), STARTUP_TIMEOUT_MS, 'Restoring saved session');
        if (!cancelled) {
          setSession(storedSession);
        }
      } catch (error) {
        if (!cancelled) {
          setStartupError(
            toUserMessage(error, 'We could not finish preparing the local library. You can still continue and try again.')
          );
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes('@')) {
      throw new Error('Enter a valid email address to continue.');
    }

    const inferredName =
      normalizedEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase()) || 'DVD Valet User';

    const nextSession: AuthSession = {
      email: normalizedEmail,
      name: inferredName,
      signed_in_at: new Date().toISOString(),
    };

    await withTimeout(ensureSchema(), STARTUP_TIMEOUT_MS, 'Preparing local library');
    await withTimeout(saveSession(nextSession), STARTUP_TIMEOUT_MS, 'Saving sign-in session');
    setStartupError(null);
    setSession(nextSession);
  }

  async function signOut() {
    await withTimeout(clearSession(), STARTUP_TIMEOUT_MS, 'Clearing sign-in session');
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ ready, session, startupError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return value;
}
