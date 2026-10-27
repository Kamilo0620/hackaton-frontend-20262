import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiError } from "../api/api";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import Loading from "../components/Loading";
import { getSagas, navigateWithViewTransition } from "../services/sagas.service";
import type { SagaSummary } from "../types/api";

export default function SagasPage() {
  const navigate = useNavigate();
  const [sagas, setSagas] = useState<SagaSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const requestKey = useMemo(() => `sagas:${reload}`, [reload]);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const loading = resolvedKey !== requestKey;

  useEffect(() => {
    const controller = new AbortController();

    getSagas(controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        const sorted = [...(Array.isArray(res) ? res : [])].sort(
          (a, b) => a.order - b.order
        );
        setSagas(sorted);
        setError(null);
        setLockedMessage(null);
        setResolvedKey(requestKey);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted || axios.isCancel(e)) return;
        const apiErr = getApiError(e);
        if (apiErr?.status === 423 || apiErr?.code === "LOG_POSE_REQUIRED") {
          setLockedMessage(
            apiErr.message ||
              "Aún no tienen Log Pose. Pidan la inspección en Reverse Mountain cuando el CP1 y el CP2 funcionen."
          );
          setError(null);
        } else {
          setLockedMessage(null);
          setError(
            apiErr?.message ??
              (e instanceof Error ? e.message : "No se pudieron cargar las sagas.")
          );
        }
        setResolvedKey(requestKey);
      });

    return () => controller.abort();
  }, [requestKey]);

  const retry = useCallback(() => {
    setError(null);
    setLockedMessage(null);
    setReload((r) => r + 1);
  }, []);

  const handleOpenSaga = (e: MouseEvent<HTMLAnchorElement>, sagaId: string) => {
    if (
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    navigateWithViewTransition(navigate, `/sagas/${sagaId}`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            Grand Line · Archivos Poneglyph
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
            La Gran Saga del Grand Line
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Selecciona un Poneglyph para recorrer su historia isla por isla en el mapa del Grand Line.
          </p>
        </div>
      </header>

      {loading ? (
        <Loading message="Descifrando inscripciones de los Poneglyphs…" />
      ) : lockedMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/40 bg-amber-950/25 p-8 text-center"
        >
          <span className="inline-block rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
            423 · LOG_POSE_REQUIRED
          </span>
          <h2 className="mt-3 text-xl font-bold text-white">
            El Grand Line requiere un Log Pose
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-300">
            {lockedMessage}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="cursor-pointer rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Reintentar
            </button>
            <Link
              to="/dashboard"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
      ) : error ? (
        <ErrorState
          title="No se pudieron cargar las sagas"
          message={error}
          onRetry={retry}
        />
      ) : sagas.length === 0 ? (
        <EmptyState
          title="Sin sagas disponibles"
          message="No hay sagas registradas en este workspace."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {sagas.map((saga) => (
            <Link
              key={saga.id}
              to={`/sagas/${saga.id}`}
              viewTransition
              onClick={(e) => handleOpenSaga(e, saga.id)}
              style={{
                backgroundColor: saga.palette.surface,
                borderColor: `${saga.palette.primary}66`,
                color: saga.palette.text,
                viewTransitionName: `saga-card-${saga.id}`,
              }}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 p-6 shadow-lg transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {/* Barra superior de paleta */}
              <div
                aria-hidden="true"
                className="mb-4 flex items-center justify-between gap-2"
              >
                <span
                  style={{
                    backgroundColor: saga.palette.background,
                    color: saga.palette.primary,
                    borderColor: `${saga.palette.primary}55`,
                  }}
                  className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wider"
                >
                  Saga #{saga.order}
                </span>

                <div className="flex items-center gap-1.5">
                  {[
                    saga.palette.background,
                    saga.palette.surface,
                    saga.palette.primary,
                    saga.palette.accent,
                  ].map((hex, i) => (
                    <span
                      key={`${saga.id}-color-${i}`}
                      className="h-3.5 w-3.5 rounded-full border border-white/25"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h2
                  style={{ viewTransitionName: `saga-title-${saga.id}` }}
                  className="text-2xl font-black tracking-tight transition group-hover:opacity-90"
                >
                  {saga.title}
                </h2>
                <p
                  style={{ color: saga.palette.primary }}
                  className="mt-1 text-sm font-semibold italic"
                >
                  {saga.subtitle}
                </p>
                <p className="mt-3 text-sm leading-relaxed opacity-90">
                  {saga.synopsis}
                </p>
              </div>

              <div
                style={{
                  backgroundColor: `${saga.palette.background}cc`,
                  borderColor: `${saga.palette.primary}33`,
                }}
                className="mt-6 grid grid-cols-2 gap-3 rounded-xl border p-3.5 text-xs sm:grid-cols-3"
              >
                <div>
                  <span className="block opacity-70">Etapas</span>
                  <strong className="mt-0.5 block text-sm font-bold">
                    {saga.stageCount} islas
                  </strong>
                </div>

                <div>
                  <span className="block opacity-70">Distancia total</span>
                  <strong
                    style={{ color: saga.palette.accent }}
                    className="mt-0.5 block font-mono text-sm font-bold"
                  >
                    {saga.totalDistanceNm.toLocaleString("es-PE")} mn
                  </strong>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="block opacity-70">Travesía</span>
                  <strong className="mt-0.5 block truncate text-xs font-semibold">
                    {saga.firstIsland} → {saga.lastIsland}
                  </strong>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span style={{ color: saga.palette.accent }}>
                  Recorrer Poneglyph
                </span>
                <span
                  style={{
                    backgroundColor: saga.palette.primary,
                    color: saga.palette.background,
                  }}
                  className="rounded-lg px-3 py-1.5 font-extrabold transition group-hover:opacity-90"
                >
                  Explorar historia →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
