import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiError } from "../api/api";

type Field = "teamName" | "email" | "password";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<Field, string>>({ teamName: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);
    try {
      await register(form.teamName, form.email, form.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const apiErr = getApiError(err);
      if (apiErr?.code === "EMAIL_ALREADY_REGISTERED") setFieldErrors({ email: apiErr.message });
      else if (apiErr?.code === "TEAM_NAME_TAKEN") setFieldErrors({ teamName: apiErr.message });
      else if (apiErr?.code === "VALIDATION_ERROR" && apiErr.details) {
        const errs: Partial<Record<Field, string>> = {};
        for (const d of apiErr.details) {
          if (d.field === "teamName" || d.field === "email" || d.field === "password") errs[d.field] = d.message;
        }
        setFieldErrors(errs);
      } else setGeneralError(apiErr?.message ?? "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  };

  const input = (field: Field, label: string, type = "text") => (
    <div>
      <input className="w-full rounded border p-2" type={type} placeholder={label}
        value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
      {fieldErrors[field] && <p className="text-sm text-red-500">{fieldErrors[field]}</p>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-20 max-w-sm space-y-3 p-6">
      <h1 className="text-2xl font-bold">Registrar tripulación</h1>
      {input("teamName", "Nombre del equipo")}
      {input("email", "Email", "email")}
      {input("password", "Contraseña", "password")}
      {generalError && <p className="text-sm text-red-500">{generalError}</p>}
      <button disabled={loading} className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50">
        {loading ? "Registrando…" : "Registrar"}
      </button>
      <p className="text-sm">¿Ya tienes cuenta? <Link to="/login" className="underline">Inicia sesión</Link></p>
    </form>
  );
}