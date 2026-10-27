import { useCallback, useEffect, useState } from "react";
import { getDashboardSummary } from "../services/dashboard.service";
import type { DashboardSummary } from "../types/api";

const berries = (n: number) => `฿ ${n.toLocaleString("es-PE")}`;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const retry = useCallback(() => setReload((r) => r + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getDashboardSummary(controller.signal)
      .then(setData)
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Error");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  if (loading) return <p className="p-6">Cargando…</p>;
  if (error)
    return (
      <div className="p-6">
        <p className="text-red-500">No se pudo cargar: {error}</p>
        <button onClick={retry} className="mt-2 rounded bg-blue-600 px-3 py-1 text-white">
          Reintentar
        </button>
      </div>
    );
  if (!data) return null;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">
        {data.team.name} ({data.team.code})
      </h1>

      {data.wanted.total === 0 ? (
        <p>Aún no hay carteles en tu workspace.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card label="Carteles" value={data.wanted.total} />
            <Card label="Recompensa total" value={berries(data.wanted.totalBounty)} />
            <Card label="Promedio" value={berries(data.wanted.averageBounty)} />
            <Card label="Tripulaciones" value={data.crews.total} />
          </div>

          {data.crews.mostWanted && (
            <p>
              Tripulación más buscada: <b>{data.crews.mostWanted.name}</b> (
              {berries(data.crews.mostWanted.totalBounty)})
            </p>
          )}

          <ul className="divide-y rounded border">
            {data.topBounties.map((w) => (
              <li key={w.id} className="flex justify-between p-3">
                <span>
                  {w.name} "{w.epithet}"
                </span>
                <span>{berries(w.bounty)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border p-4">
      <p className="text-sm opacity-70">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}