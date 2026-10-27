import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loading from "../components/Loading";
import { useAuth } from "./AuthContext";

export function PrivateRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") return <Loading message="Verificando sesión…" />;
  if (status === "anonymous")
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

// Para /login y /register: si ya hay sesión, no mostrarlos
export function PublicOnlyRoute() {
  const { status } = useAuth();
  if (status === "checking") return <Loading message="Verificando sesión…" />;
  if (status === "authenticated") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
