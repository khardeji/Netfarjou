import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
export const AuthContext = createContext<{ user: User | null; admin: boolean; loading: boolean }>({ user: null, admin: false, loading: true });
export const useAuth = () => useContext(AuthContext);