import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useAuth as useReplitAuth } from "@workspace/replit-auth-web";
import type { AuthUser } from "@workspace/replit-auth-web";
import AuthSplash from "@/components/AuthSplash";

export type { AuthUser };

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useReplitAuth();
  const [redirecting, setRedirecting] = useState<string | null>(null);

  const login = useCallback(() => {
    setRedirecting("Taking you to secure sign-in\u2026");
    auth.login();
  }, [auth]);

  const logout = useCallback(() => {
    setRedirecting("Signing you out\u2026");
    auth.logout();
  }, [auth]);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
      {redirecting && <AuthSplash label={redirecting} />}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
