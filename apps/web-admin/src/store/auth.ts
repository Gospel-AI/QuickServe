import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: (accessToken, user) => {
        set({ accessToken, user, isAuthenticated: true });
      },

      logout: () => {
        set({ accessToken: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'quickserve-admin-auth',
    }
  )
);
