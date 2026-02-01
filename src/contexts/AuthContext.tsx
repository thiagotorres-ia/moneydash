
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AuthContextType, User } from '../types';
import { supabase } from '../lib/supabase';

const LOGIN_TIMEOUT_MS = 15000;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializationTimeout = useRef<number | null>(null);

  const fetchProfile = useCallback(async (id: string, email: string, metadata: any) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      return {
        id,
        email: email,
        name: profile?.name || metadata?.name || 'Usuário',
        avatar: profile?.avatar_url || metadata?.avatar_url
      };
    } catch (err) {
      return {
        id,
        email: email,
        name: metadata?.name || 'Usuário',
        avatar: metadata?.avatar_url
      };
    }
  }, []);

  useEffect(() => {
    // Failsafe: Se a inicialização demorar mais de 5 segundos, libera a tela
    initializationTimeout.current = window.setTimeout(() => {
      if (isLoading) {
        console.warn('Auth initialization timed out, forcing stop loading.');
        setIsLoading(false);
      }
    }, 5000);

    const initSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          const userData = await fetchProfile(session.user.id, session.user.email!, session.user.user_metadata);
          setUser(userData);
        }
      } catch (err) {
        console.error('Erro ao recuperar sessão:', err);
      } finally {
        setIsLoading(false);
        if (initializationTimeout.current) window.clearTimeout(initializationTimeout.current);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          if (session?.user) {
            const userData = await fetchProfile(session.user.id, session.user.email!, session.user.user_metadata);
            setUser(userData);
          }
        } catch (err) {
          console.error('[Auth] fetchProfile falhou:', err);
          if (session?.user) {
            const fallbackUser: User = {
              id: session.user.id,
              email: session.user.email ?? '',
              name: session.user.user_metadata?.name || 'Usuário',
              avatar: session.user.user_metadata?.avatar_url
            };
            setUser(fallbackUser);
          }
        } finally {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (initializationTimeout.current) window.clearTimeout(initializationTimeout.current);
    };
  }, [fetchProfile]);

  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), LOGIN_TIMEOUT_MS)
      );
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password: pass }),
        timeoutPromise
      ]);
      if (error) throw error;
    } catch (err: any) {
      if (err?.message === 'timeout') {
        console.warn('[Auth] Login timeout após', LOGIN_TIMEOUT_MS, 'ms');
        setError('Tempo esgotado. Tente novamente.');
      } else {
        setError(err?.message || 'Falha ao fazer login');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            name: name,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
          }
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Falha ao criar conta');
      setIsLoading(false);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      login, 
      signup,
      logout, 
      isLoading,
      error,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
