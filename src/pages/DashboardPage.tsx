import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiError } from "../api/api";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import Loading from "../components/Loading";
import { getDashboardSummary, getLogPose } from "../services/dashboard.service";
import type { DashboardSummary, LogPose } from "../types/api";

const berries = (n: number) => `฿ ${n.toLocaleString("es-PE")}`;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [logPose, setLogPose] = useState<LogPose | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReload((r) => r + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getDashboardSummary(controller.signal),
      getLogPose(controller.signal),
    ])
      .then(([summaryData, logPoseData]) => {
        if (controller.signal.aborted) return;
        setData(summaryData);
        setLogPose(logPoseData);
        setError(null);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        const apiErr = getApiError(e);
        setError(apiErr?.message ?? (e instanceof Error ? e.message : "Error al cargar el dashboard"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reload]);

  if (loading) return <Loading message="Cargando indicadores y estado del Log Pose…" />;
  if (error) return <ErrorState message={`No se pudo cargar: ${error}`} onRetry={retry} />;
  if (!data || !logPose) return null;

  const isUnlocked = logPose.status === "UNLOCKED" || logPose.grandLineUnlocked;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold">
          {data.team.name} <span className="text-amber-400">({data.team.code})</span>
        </h1>
        <Link
          to="/wanted"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          Ver Carteles Se Busca
        </Link>
      </div>

      {/* Estado del Log Pose */}
      <section
        aria-label="Estado del Log Pose"
        className={`rounded-xl border p-5 ${
          isUnlocked
            ? "border-emerald-500/40 bg-emerald-950/25"
            : "border-amber-500/40 bg-amber-950/20"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
              isUnlocked
                ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                : "border-amber-400/50 bg-amber-500/20 text-amber-300"
            }`}
          >
            Log Pose: {logPose.status}
          </span>
          <span className="text-xs text-slate-400">
            Grand Line: {isUnlocked ? "Desbloqueado" : "Bloqueado"}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-200">{logPose.message}</p>
        {logPose.unlockedAt && (
          <p className="mt-1 text-xs text-emerald-300/80">
            Desbloqueado el {new Date(logPose.unlockedAt).toLocaleString("es-PE")}
          </p>
        )}
      </section>

      {data.wanted.total === 0 ? (
        <EmptyState
          title="Sin carteles registrados"
          message="Aún no hay carteles en tu workspace."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card label="Carteles" value={data.wanted.total} />
            <Card label="Recompensa total" value={berries(data.wanted.totalBounty)} />
            <Card label="Promedio" value={berries(data.wanted.averageBounty)} />
            <Card label="Tripulaciones" value={data.crews.total} />
          </div>

          {data.crews.mostWanted && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-300">
                Tripulación más buscada:{" "}
                <b className="text-white">{data.crews.mostWanted.name}</b> — Barco:{" "}
                <span className="text-slate-200">{data.crews.mostWanted.shipName}</span> (
                <span className="font-semibold text-amber-400">
                  {berries(data.crews.mostWanted.totalBounty)}
                </span>
                )
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-lg font-semibold">Top Recompensas</h2>
            <ul className="divide-y divide-slate-800">
              {data.topBounties.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      to={`/wanted/${w.id}`}
                      className="font-medium text-white hover:text-amber-400"
                    >
                      {w.name} &ldquo;{w.epithet}&rdquo;
                    </Link>
                    {w.crew && (
                      <p className="text-xs text-slate-400">
                        {w.crew.name} · {w.lastSeenIsland}
                      </p>
                    )}
                  </div>
                  <span className="font-mono font-semibold text-amber-400">
                    {berries(w.bounty)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
