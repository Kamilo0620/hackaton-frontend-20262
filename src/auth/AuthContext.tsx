import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, setOnUnauthorized, TOKEN_KEY } from "../api/api";
import type { AuthResponse, MeResponse, Team, User } from "../types/api";

type Status = "checking" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: Status;
  user: User | null;
  team: Team | null;
  login: (email: string, password: string) => Promise<void>;
  register: (teamName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(
    localStorage.getItem(TOKEN_KEY) ? "checking" : "anonymous"
  );
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setTeam(null);
    setStatus("anonymous");
  }, []);

  // Si cualquier petición da 401 → cerrar sesión (PrivateRoute manda al login)
  useEffect(() => {
    setOnUnauthorized(clear);
    return () => setOnUnauthorized(null);
  }, [clear]);

  // Restaurar sesión al recargar
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api
      .get<MeResponse>("/auth/me")
      .then((res) => {
        setUser(res.data.user);
        setTeam(res.data.team);
        setStatus("authenticated");
      })
      .catch(clear);
  }, [clear]);

  const saveSession = (data: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setTeam(data.team);
    setStatus("authenticated");
  };

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    saveSession(res.data);
  };

  const register = async (teamName: string, email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/register", { teamName, email, password });
    saveSession(res.data);
  };

  return (
    <AuthContext.Provider value={{ status, user, team, login, register, logout: clear }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}