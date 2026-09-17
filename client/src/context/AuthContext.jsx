import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, toE164Phone } from '../api';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

const AUTH_MESSAGES = {
  'Invalid login credentials': 'Wrong mobile number or password',
  'User already registered': 'This mobile number is already registered. Please log in.',
  'Phone signups are disabled': 'Mobile login is not turned on yet. Please contact the site admin.',
  'Unsupported phone provider': 'Mobile login is not turned on yet. Please contact the site admin.',
};
const friendly = (error) => new Error(AUTH_MESSAGES[error.message] || error.message);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
    async (mobile, password) => {
      const phone = toE164Phone(mobile);
      if (!phone) throw new Error('Enter a valid 10 digit mobile number');
      const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
      if (error) throw friendly(error);
      userIdRef.current = data.session.user.id;
      const profile = await loadProfile(data.session);
      if (!profile) throw new Error('Could not load your account. Please try again.');
      return profile;
    },
    [loadProfile]
  );

  const register = useCallback(
    async (mobile, password) => {
      const phone = toE164Phone(mobile);
      if (!phone) throw new Error('Enter a valid 10 digit mobile number');
      const { data, error } = await supabase.auth.signUp({ phone, password });
      if (error) throw friendly(error);
      if (!data.session) {
        // An empty identities list means the number is already registered
        if (data.user && data.user.identities?.length === 0) throw new Error(AUTH_MESSAGES['User already registered']);
        throw new Error('Could not create your account. Please try again.');
      }
      userIdRef.current = data.session.user.id;
      const profile = await loadProfile(data.session);
      if (!profile) throw new Error('Could not load your account. Please try again.');
      return profile;
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

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw friendly(error);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
