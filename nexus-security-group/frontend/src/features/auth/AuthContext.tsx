import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { decodeTokenClaims, type TokenClaims } from '../../shared/auth/decodeTokenClaims';
import { getToken, removeToken, setToken as saveToken } from '../../shared/storage/tokenStorage';

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  claims: TokenClaims;
  permissions: string[];
  hasPermission: (resource: string, action: string) => boolean;
  role?: string;
  authSource?: string;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isTokenExpired(claims: TokenClaims): boolean {
  if (claims.exp === undefined) return false;
  return Date.now() >= claims.exp * 1000;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getToken());
  const claims = decodeTokenClaims(token);
  const permissions = claims.permissions ?? [];
  const hasPermission = (resource: string, action: string) => permissions.includes(`${resource}:${action}`);

  useEffect(() => {
    if (token && isTokenExpired(decodeTokenClaims(token))) {
      removeToken();
      setToken(null);
    }
  }, [token]);

  const login = (newToken: string) => {
    saveToken(newToken);
    setToken(newToken);
  };

  const logout = () => {
    removeToken();
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        login,
        logout,
        isAuthenticated: !!token && !isTokenExpired(claims),
        claims,
        permissions,
        hasPermission,
        role: claims.role,
        authSource: claims.auth_source,
        isAdmin: claims.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
