import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiError } from "../api/api";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true }); // vuelve a donde quería ir
    } catch (err) {
      setError(getApiError(err)?.message ?? "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-20 max-w-sm space-y-3 p-6">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      <input className="w-full rounded border p-2" type="email" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full rounded border p-2" type="password" placeholder="Contraseña"
        value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button disabled={loading} className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50">
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-sm">¿Sin cuenta? <Link to="/register" className="underline">Regístrate</Link></p>
    </form>
  );
}