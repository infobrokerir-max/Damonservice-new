import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../lib/types';
import { supabaseBackend } from '../lib/supabaseBackend';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const role = session.user.app_metadata?.role || 'employee';
        const fullName = session.user.user_metadata?.full_name || 'Unknown User';
        const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user';

        setUser({
          id: session.user.id,
          username,
          fullName,
          role,
          isActive: true,
        });
      }
      setIsLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = session.user.app_metadata?.role || 'employee';
        const fullName = session.user.user_metadata?.full_name || 'Unknown User';
        const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user';

        setUser({
          id: session.user.id,
          username,
          fullName,
          role,
          isActive: true,
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (username: string, password?: string) => {
    const foundUser = await supabaseBackend.login(username, password);
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await supabaseBackend.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
