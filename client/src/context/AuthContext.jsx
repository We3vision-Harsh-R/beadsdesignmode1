import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

const AUTH_MESSAGES = {
  'Invalid login credentials': 'Wrong email or password',
  'Email not confirmed': 'Please confirm your email first. Check your inbox for the link.',
  'User already registered': 'This email is already registered. Please log in.',
};
const friendly = (error) => new Error(AUTH_MESSAGES[error.message] || error.message);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  // Bumped on every login/logout so a slow, outdated profile response is ignored
  const version = useRef(0);
  const userIdRef = useRef(null);

  // Loads the store profile (name, phone, role) for the signed-in Supabase user
  const loadProfile = useCallback(async (session) => {
    const mine = ++version.current;
    if (!session) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const { user: profile } = await api('/auth/me');
      if (mine === version.current) setUser(profile);
      return profile;
    } catch {
      if (mine === version.current) setUser(null);
      return null;
    } finally {
      if (mine === version.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      userIdRef.current = data.session?.user.id || null;
      loadProfile(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      // SIGNED_IN also fires when the tab regains focus; only reload when the user changes
      const changedUser = (session?.user.id || null) !== userIdRef.current;
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED' || (event === 'SIGNED_IN' && changedUser)) {
        userIdRef.current = session?.user.id || null;
        // Run outside the callback so Supabase isn't called while it holds its auth lock
        setTimeout(() => loadProfile(session), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw friendly(error);
      userIdRef.current = data.session.user.id;
      const profile = await loadProfile(data.session);
      if (!profile) throw new Error('Could not load your account. Please try again.');
      return profile;
    },
    [loadProfile]
  );

  // Returns { needsConfirmation } when Supabase asks the user to confirm their email
  const register = useCallback(
    async ({ name, email, phone, password }) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim(), phone: phone.trim() },
          emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
        },
      });
      if (error) throw friendly(error);
      if (!data.session) {
        // An empty identities list means the email is already registered
        if (data.user && data.user.identities?.length === 0) throw new Error(AUTH_MESSAGES['User already registered']);
        return { needsConfirmation: true };
      }
      userIdRef.current = data.session.user.id;
      await loadProfile(data.session);
      return { needsConfirmation: false };
    },
    [loadProfile]
  );

  const logout = useCallback(async () => {
    // Clear the UI right away; Supabase finishes signing out in the background
    version.current += 1;
    userIdRef.current = null;
    setUser(null);
    await supabase.auth.signOut();
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw friendly(error);
  }, []);

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw friendly(error);
    setRecovery(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, recovery, login, register, logout, sendPasswordReset, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
