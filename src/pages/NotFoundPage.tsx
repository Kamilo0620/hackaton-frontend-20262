import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-amber-400">Error 404</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
        404 — Página no encontrada
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-400">
        La isla o ruta que buscas no figura en las cartas de navegación de la Guild.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/dashboard"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          Volver al Dashboard
        </Link>
        <Link
          to="/wanted"
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          Ir a Se Busca
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
