import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getApiError } from "../api/api";
import ErrorState from "../components/ErrorState";
import Loading from "../components/Loading";
import { getWantedById } from "../services/wanted.service";
import type { WantedDetail, WantedStatus } from "../types/api";

const berries = (n: number) => `฿ ${n.toLocaleString("es-PE")}`;

const STATUS_LABELS: Record<WantedStatus, string> = {
  AT_LARGE: "Prófugo (AT_LARGE)",
  CAPTURED: "Capturado (CAPTURED)",
  MISSING: "Desaparecido (MISSING)",
};

const STATUS_BADGE: Record<WantedStatus, string> = {
  AT_LARGE: "border-red-500/40 bg-red-500/20 text-red-300",
  CAPTURED: "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
  MISSING: "border-amber-500/40 bg-amber-500/20 text-amber-300",
};

export default function WantedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const backUrl =
    (location.state as { from?: string } | null)?.from ?? "/wanted";

  const [detail, setDetail] = useState<WantedDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reload, setReload] = useState(0);

  const requestKey = useMemo(() => `${id ?? ""}:${reload}`, [id, reload]);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const loading = resolvedKey !== requestKey;

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    getWantedById(id, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setDetail(res);
        setError(null);
        setNotFound(false);
        setResolvedKey(requestKey);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted || axios.isCancel(e)) return;
        const apiErr = getApiError(e);
        if (apiErr?.status === 404 || apiErr?.code === "NOT_FOUND") {
          setNotFound(true);
          setError(null);
        } else {
          setNotFound(false);
          setError(
            apiErr?.message ??
              (e instanceof Error ? e.message : "No se pudo cargar el cartel.")
          );
        }
        setResolvedKey(requestKey);
      });

    return () => controller.abort();
  }, [id, requestKey]);

  const retry = useCallback(() => {
    setError(null);
    setReload((r) => r + 1);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={backUrl}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-amber-500 hover:text-white"
        >
          ← Volver al listado de Se Busca
        </Link>
      </div>

      {loading ? (
        <Loading message="Cargando expediente del cartel…" />
      ) : notFound ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-8 text-center">
          <h2 className="text-xl font-bold text-white">Cartel no encontrado (404)</h2>
          <p className="mt-2 text-sm text-slate-300">
            El cartel solicitado no existe en el workspace de tu tripulación.
          </p>
          <Link
            to={backUrl}
            className="mt-4 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            Volver a Se Busca
          </Link>
        </div>
      ) : error || !detail ? (
        <ErrorState
          title="No se pudo cargar el cartel"
          message={error ?? "Error desconocido."}
          onRetry={retry}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Cartel principal */}
          <section className="rounded-xl border-2 border-amber-500/40 bg-slate-900/80 p-6 text-center lg:col-span-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-400">
              WANTED
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              DEAD OR ALIVE
            </p>

            <div className="my-5 rounded-lg border border-slate-800 bg-slate-950/80 p-5">
              <h1 className="text-2xl font-extrabold text-white">{detail.name}</h1>
              <p className="mt-1 text-sm italic text-amber-300">
                &ldquo;{detail.epithet}&rdquo;
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span
                  className={`rounded border px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_BADGE[detail.status]
                  }`}
                >
                  {STATUS_LABELS[detail.status]}
                </span>
              </div>
            </div>

            <p className="text-xs uppercase tracking-widest text-slate-400">Recompensa</p>
            <p className="mt-1 font-mono text-2xl font-black text-amber-400">
              {berries(detail.bounty)}
            </p>

            <div className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-400">
              Nivel de amenaza:{" "}
              <span className="font-bold text-amber-400">
                {"★".repeat(detail.threatLevel)} ({detail.threatLevel}/5)
              </span>
            </div>
          </section>

          {/* Información detallada e historial */}
          <section className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-lg font-bold text-white">Expediente de la Guild</h2>
              <p className="mt-3 leading-relaxed text-slate-300">{detail.bio}</p>

              <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-950/60 p-3.5">
                  <dt className="text-xs text-slate-400">Tripulación</dt>
                  <dd className="mt-1 font-semibold text-white">
                    {detail.crew ? detail.crew.name : "Sin tripulación"}
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-950/60 p-3.5">
                  <dt className="text-xs text-slate-400">Rol en la tripulación</dt>
                  <dd className="mt-1 font-semibold text-white">{detail.role}</dd>
                </div>

                <div className="rounded-lg bg-slate-950/60 p-3.5">
                  <dt className="text-xs text-slate-400">Fruta del Diablo</dt>
                  <dd className="mt-1 font-semibold text-white">
                    {detail.devilFruit
                      ? `${detail.devilFruit.name} (${detail.devilFruit.type})`
                      : "Ninguna (NONE)"}
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-950/60 p-3.5">
                  <dt className="text-xs text-slate-400">Edad / Altura</dt>
                  <dd className="mt-1 font-semibold text-white">
                    {detail.age} años · {detail.heightCm} cm
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-950/60 p-3.5">
                  <dt className="text-xs text-slate-400">Último avistamiento</dt>
                  <dd className="mt-1 font-semibold text-white">
                    {detail.lastSeen.island} (
                    {new Date(detail.lastSeen.seenAt).toLocaleDateString("es-PE")})
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-950/60 p-3.5">
                  <dt className="text-xs text-slate-400">Última actualización</dt>
                  <dd className="mt-1 font-semibold text-white">
                    {new Date(detail.updatedAt).toLocaleString("es-PE")}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Historial de recompensas */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-lg font-bold text-white">Historial de Recompensas</h2>
              {detail.bountyHistory.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">Sin historial registrado.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-800">
                  {detail.bountyHistory.map((entry, idx) => (
                    <li
                      key={`${entry.issuedAt}-${idx}`}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="text-slate-400">
                        Emisión #{idx + 1} ·{" "}
                        {new Date(entry.issuedAt).toLocaleDateString("es-PE")}
                      </span>
                      <span className="font-mono font-bold text-amber-400">
                        {berries(entry.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
