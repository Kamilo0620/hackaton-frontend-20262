import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { getNewsFeed } from "../services/news.service";
import { getApiError } from "../api/api";
import type { NewsFilters, NewsItem, NewsStatus } from "../types/api";

const TYPES: string[] = ["BOUNTY_UPDATE", "BATTLE", "MARINE_OPERATION", "WORLD_GOVERNMENT", "DISCOVERY"];
const PRIORITIES: string[] = []; // ← falta: copiar las opciones del desplegable "priority" de Swagger
const STATUSES: NewsStatus[] = ["RUMOR", "CONFIRMED", "DEBUNKED"];

export interface NewsOutletContext {
  updateItem: (item: NewsItem) => void;
}

function pick(list: string[], value: string | null): string {
  if (!value) return "";
  if (list.length === 0) return value; // si aún no llenamos la lista, aceptar
  return list.includes(value) ? value : "";
}

export default function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const filters: NewsFilters = {
    type: pick(TYPES, searchParams.get("type")),
    priority: pick(PRIORITIES, searchParams.get("priority")),
    status: STATUSES.find((s) => s === searchParams.get("status")) ?? "",
  };
  const { type, priority, status } = filters;

  const [items, setItems] = useState<NewsItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingRef = useRef(false);                     // una sola carga en vuelo
  const genRef = useRef(0);                             // "generación" de filtros
  const controllerRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (from: string | null, gen: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        const res = await getNewsFeed(from, { type, priority, status }, controller.signal);
        if (gen !== genRef.current) return; // respuesta de filtros viejos: se ignora
        setItems((prev) => {
          const seen = new Set(prev.map((n) => n.id));
          return [...prev, ...res.items.filter((n) => !seen.has(n.id))]; // nada se cuenta dos veces
        });
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } catch (e) {
        if (gen === genRef.current && !controller.signal.aborted) {
          setError(getApiError(e)?.message ?? "No se pudieron cargar las noticias");
        }
      } finally {
        if (gen === genRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [type, priority, status]
  );

  // Al cambiar filtros: cancelar lo que esté en vuelo y empezar de cero
  useEffect(() => {
    genRef.current += 1;
    const gen = genRef.current;
    controllerRef.current?.abort();
    loadingRef.current = false;
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setError(null);
    void load(null, gen);
    return () => controllerRef.current?.abort();
  }, [load]);

  // Infinite scroll: cuando el "sentinel" del final se ve, cargar más
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor && hasMore && !error && !loadingRef.current) {
          void load(cursor, genRef.current);
        }
      },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cursor, hasMore, error, load]);

  const setFilter = (key: keyof NewsFilters, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  // Cuando el detalle verifica una noticia, actualizarla aquí sin volver a pedir el feed
  const updateItem = useCallback((updated: NewsItem) => {
    setItems((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  }, []);

  const sel = "rounded border bg-transparent p-2";

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Noticias del Mundo</h1>

      <div className="flex flex-wrap gap-2">
        <select className={sel} value={type} onChange={(e) => setFilter("type", e.target.value)}>
          <option value="">Todos los tipos</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={sel} value={priority} onChange={(e) => setFilter("priority", e.target.value)}>
          <option value="">Todas las prioridades</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className={sel} value={status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id}>
            <Link to={{ pathname: `/news/${n.id}`, search: location.search }}
              className="block rounded border p-3 hover:bg-white/5">
              <div className="flex justify-between gap-2 text-sm opacity-70">
                <span>{n.type} · {n.priority}</span>
                <span>{n.status}</span>
              </div>
              <p className="font-semibold">{n.title}</p>
              {n.summary && <p className="text-sm opacity-80">{n.summary}</p>}
            </Link>
          </li>
        ))}
      </ul>

      {/* Estados del final de la lista */}
      {loading && <p className="p-3 text-center">Cargando…</p>}
      {error && (
        <div className="p-3 text-center">
          <p className="text-red-500">{error}</p>
          <button onClick={() => void load(cursor, genRef.current)}
            className="mt-2 rounded bg-blue-600 px-3 py-1 text-white">Reintentar</button>
        </div>
      )}
      {!loading && !error && items.length === 0 && !hasMore && (
        <p className="p-3 text-center">No hay noticias con estos filtros.</p>
      )}
      {!hasMore && items.length > 0 && <p className="p-3 text-center opacity-60">— Fin de las noticias —</p>}

      <div ref={sentinelRef} className="h-1" />

      {/* El detalle se abre encima: el feed no se desmonta, conserva posición y datos */}
      <Outlet context={{ updateItem } satisfies NewsOutletContext} />
    </div>
  );
}