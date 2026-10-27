import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getApiError } from "../api/api";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import Loading from "../components/Loading";
import { getCrews, getWantedList } from "../services/wanted.service";
import type {
  Crew,
  FruitType,
  WantedPage as WantedPageData,
  WantedQueryParams,
  WantedSize,
  WantedSort,
  WantedStatus,
} from "../types/api";

const VALID_STATUSES: readonly WantedStatus[] = ["AT_LARGE", "CAPTURED", "MISSING"];
const VALID_FRUITS: readonly FruitType[] = ["PARAMECIA", "ZOAN", "LOGIA", "NONE"];
const VALID_SORTS: readonly WantedSort[] = ["bounty,desc", "name,asc", "updatedAt,desc"];
const VALID_SIZES: readonly WantedSize[] = [10, 20, 50];

const DEFAULT_SIZE: WantedSize = 20;
const DEFAULT_SORT: WantedSort = "bounty,desc";

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

const FRUIT_LABELS: Record<FruitType, string> = {
  PARAMECIA: "Paramecia",
  ZOAN: "Zoan",
  LOGIA: "Logia",
  NONE: "Sin fruta (NONE)",
};

const SORT_LABELS: Record<WantedSort, string> = {
  "bounty,desc": "Mayor recompensa (bounty,desc)",
  "name,asc": "Nombre A–Z (name,asc)",
  "updatedAt,desc": "Más recientes (updatedAt,desc)",
};

const berries = (n: number) => `฿ ${n.toLocaleString("es-PE")}`;

interface SanitizedWantedParams {
  page: number;
  size: WantedSize;
  status?: WantedStatus;
  crewId?: string;
  fruit?: FruitType;
  q: string;
  sort: WantedSort;
  hadInvalidParams: boolean;
}

function parseWantedSearchParams(searchParams: URLSearchParams): SanitizedWantedParams {
  let hadInvalidParams = false;

  // page (0-based integer)
  const rawPage = searchParams.get("page");
  let page = 0;
  if (rawPage !== null && rawPage !== "") {
    const parsedPage = Number(rawPage);
    if (!Number.isInteger(parsedPage) || parsedPage < 0) {
      hadInvalidParams = true;
      page = 0;
    } else {
      page = parsedPage;
    }
  }

  // size (10, 20, 50)
  const rawSize = searchParams.get("size");
  let size: WantedSize = DEFAULT_SIZE;
  if (rawSize !== null && rawSize !== "") {
    const parsedSize = Number(rawSize) as WantedSize;
    if (!VALID_SIZES.includes(parsedSize)) {
      hadInvalidParams = true;
      size = DEFAULT_SIZE;
    } else {
      size = parsedSize;
    }
  }

  // status
  const rawStatus = searchParams.get("status");
  let status: WantedStatus | undefined;
  if (rawStatus !== null && rawStatus !== "") {
    if (VALID_STATUSES.includes(rawStatus as WantedStatus)) {
      status = rawStatus as WantedStatus;
    } else {
      hadInvalidParams = true;
    }
  }

  // fruit
  const rawFruit = searchParams.get("fruit");
  let fruit: FruitType | undefined;
  if (rawFruit !== null && rawFruit !== "") {
    if (VALID_FRUITS.includes(rawFruit as FruitType)) {
      fruit = rawFruit as FruitType;
    } else {
      hadInvalidParams = true;
    }
  }

  // sort
  const rawSort = searchParams.get("sort");
  let sort: WantedSort = DEFAULT_SORT;
  if (rawSort !== null && rawSort !== "") {
    if (VALID_SORTS.includes(rawSort as WantedSort)) {
      sort = rawSort as WantedSort;
    } else {
      hadInvalidParams = true;
    }
  }

  // crewId
  const rawCrewId = searchParams.get("crewId");
  let crewId: string | undefined;
  if (rawCrewId !== null && rawCrewId.trim() !== "") {
    const trimmedCrew = rawCrewId.trim();
    if (trimmedCrew.length <= 200) {
      crewId = trimmedCrew;
    } else {
      hadInvalidParams = true;
      crewId = trimmedCrew.slice(0, 200);
    }
  }

  // q
  const rawQ = searchParams.get("q");
  let q = "";
  if (rawQ !== null && rawQ.trim() !== "") {
    const trimmedQ = rawQ.trim();
    if (trimmedQ.length <= 100) {
      q = trimmedQ;
    } else {
      hadInvalidParams = true;
      q = trimmedQ.slice(0, 100);
    }
  }

  return { page, size, status, crewId, fruit, q, sort, hadInvalidParams };
}

function buildSearchParams(params: {
  page: number;
  size: WantedSize;
  status?: WantedStatus;
  crewId?: string;
  fruit?: FruitType;
  q: string;
  sort: WantedSort;
}): URLSearchParams {
  const next = new URLSearchParams();
  if (params.page > 0) next.set("page", String(params.page));
  if (params.size !== DEFAULT_SIZE) next.set("size", String(params.size));
  if (params.status) next.set("status", params.status);
  if (params.crewId) next.set("crewId", params.crewId);
  if (params.fruit) next.set("fruit", params.fruit);
  if (params.q.trim() !== "") next.set("q", params.q.trim());
  if (params.sort !== DEFAULT_SORT) next.set("sort", params.sort);
  return next;
}

export default function WantedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const parsed = useMemo(() => parseWantedSearchParams(searchParams), [searchParams]);

  // Local draft for debounced search input that stays synced with URL (Back/Forward)
  const [draftSearch, setDraftSearch] = useState<{ baseQ: string; value: string }>({
    baseQ: parsed.q,
    value: parsed.q,
  });
  const searchInputValue =
    draftSearch.baseQ === parsed.q ? draftSearch.value : parsed.q;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [crews, setCrews] = useState<Crew[]>([]);
  const [data, setData] = useState<WantedPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const requestKey = useMemo(
    () =>
      JSON.stringify({
        page: parsed.page,
        size: parsed.size,
        status: parsed.status ?? "",
        crewId: parsed.crewId ?? "",
        fruit: parsed.fruit ?? "",
        q: parsed.q,
        sort: parsed.sort,
        reload,
      }),
    [
      parsed.page,
      parsed.size,
      parsed.status,
      parsed.crewId,
      parsed.fruit,
      parsed.q,
      parsed.sort,
      reload,
    ]
  );

  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const loading = resolvedKey !== requestKey;

  // Normalize URL if invalid query parameters were present
  useEffect(() => {
    if (parsed.hadInvalidParams) {
      setSearchParams(buildSearchParams(parsed), { replace: true });
    }
  }, [parsed, setSearchParams]);

  // Load crews for the filter dropdown
  useEffect(() => {
    const controller = new AbortController();
    getCrews(controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) {
          setCrews(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {
        // Non-blocking for main wanted list
      });
    return () => controller.abort();
  }, []);

  // Load paginated wanted list from server with race-condition protection
  useEffect(() => {
    const controller = new AbortController();
    const query: WantedQueryParams = {
      page: parsed.page,
      size: parsed.size,
      status: parsed.status,
      crewId: parsed.crewId,
      fruit: parsed.fruit,
      q: parsed.q || undefined,
      sort: parsed.sort,
    };

    getWantedList(query, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;

        // Never leave the user on a page that no longer exists
        if (parsed.page > 0 && (res.totalPages === 0 || parsed.page >= res.totalPages)) {
          const targetPage = Math.max(0, res.totalPages - 1);
          setSearchParams(
            buildSearchParams({ ...parsed, page: targetPage }),
            { replace: true }
          );
          return;
        }

        setData(res);
        setError(null);
        setResolvedKey(requestKey);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted || axios.isCancel(e)) return;
        const apiErr = getApiError(e);
        setError(
          apiErr?.message ??
            (e instanceof Error ? e.message : "No se pudieron cargar los carteles.")
        );
        setResolvedKey(requestKey);
      });

    return () => controller.abort();
  }, [parsed, requestKey, setSearchParams]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateFilters = useCallback(
    (
      updates: Partial<{
        page: number;
        size: WantedSize;
        status?: WantedStatus;
        crewId?: string;
        fruit?: FruitType;
        q: string;
        sort: WantedSort;
      }>
    ) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const nextState = {
        page: updates.page ?? 0,
        size: updates.size ?? parsed.size,
        status: "status" in updates ? updates.status : parsed.status,
        crewId: "crewId" in updates ? updates.crewId : parsed.crewId,
        fruit: "fruit" in updates ? updates.fruit : parsed.fruit,
        q: updates.q !== undefined ? updates.q : parsed.q,
        sort: updates.sort ?? parsed.sort,
      };
      setSearchParams(buildSearchParams(nextState));
    },
    [parsed, setSearchParams]
  );

  const handleSearchChange = (value: string) => {
    setDraftSearch({ baseQ: parsed.q, value });
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim().slice(0, 100);
      if (trimmed !== parsed.q) {
        setSearchParams(
          buildSearchParams({
            ...parsed,
            q: trimmed,
            page: 0,
          })
        );
      }
    }, 350);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const trimmed = searchInputValue.trim().slice(0, 100);
    if (trimmed !== parsed.q) {
      updateFilters({ q: trimmed, page: 0 });
    }
  };

  const handleClearFilters = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setDraftSearch({ baseQ: "", value: "" });
    setSearchParams(new URLSearchParams());
  };

  const retry = useCallback(() => {
    setError(null);
    setReload((r) => r + 1);
  }, []);

  const hasActiveFilters = Boolean(
    parsed.status ||
      parsed.crewId ||
      parsed.fruit ||
      parsed.q ||
      parsed.sort !== DEFAULT_SORT ||
      parsed.size !== DEFAULT_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Cabecera fija */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Carteles de &ldquo;Se Busca&rdquo;
          </h1>
          <p className="text-sm text-slate-400">
            Registro oficial de recompensas del East Blue y Grand Line
          </p>
        </div>
        {data && (
          <div className="text-sm text-slate-300">
            Total encontrados:{" "}
            <span className="font-bold text-amber-400">{data.totalElements}</span>
          </div>
        )}
      </div>

      {/* Barra de filtros y búsqueda (permanece fija sin mover el layout) */}
      <section
        aria-label="Filtros y búsqueda"
        className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          {/* Búsqueda con debounce */}
          <form onSubmit={handleSearchSubmit} className="lg:col-span-2">
            <label
              htmlFor="wanted-search"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Buscar por nombre o epíteto
            </label>
            <input
              id="wanted-search"
              type="search"
              value={searchInputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Ej. Bartolo, Media Luna..."
              maxLength={100}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </form>

          {/* Filtro Estado */}
          <div>
            <label
              htmlFor="wanted-status"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Estado
            </label>
            <select
              id="wanted-status"
              value={parsed.status ?? ""}
              onChange={(e) =>
                updateFilters({
                  status: (e.target.value || undefined) as WantedStatus | undefined,
                  page: 0,
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">Todos los estados</option>
              {VALID_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Tripulación */}
          <div>
            <label
              htmlFor="wanted-crew"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Tripulación
            </label>
            <select
              id="wanted-crew"
              value={parsed.crewId ?? ""}
              onChange={(e) =>
                updateFilters({
                  crewId: e.target.value || undefined,
                  page: 0,
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">Todas las tripulaciones</option>
              {crews.map((crew) => (
                <option key={crew.id} value={crew.id}>
                  {crew.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Fruta del Diablo */}
          <div>
            <label
              htmlFor="wanted-fruit"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Fruta del Diablo
            </label>
            <select
              id="wanted-fruit"
              value={parsed.fruit ?? ""}
              onChange={(e) =>
                updateFilters({
                  fruit: (e.target.value || undefined) as FruitType | undefined,
                  page: 0,
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">Todas</option>
              {VALID_FRUITS.map((fr) => (
                <option key={fr} value={fr}>
                  {FRUIT_LABELS[fr]}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenamiento */}
          <div>
            <label
              htmlFor="wanted-sort"
              className="mb-1 block text-xs font-medium text-slate-400"
            >
              Ordenar por
            </label>
            <select
              id="wanted-sort"
              value={parsed.sort}
              onChange={(e) =>
                updateFilters({
                  sort: e.target.value as WantedSort,
                  page: 0,
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            >
              {VALID_SORTS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila inferior de controles: tamaño de página y limpiar filtros */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
          <div className="flex items-center gap-2">
            <label htmlFor="wanted-size" className="text-xs font-medium text-slate-400">
              Carteles por página:
            </label>
            <select
              id="wanted-size"
              value={parsed.size}
              onChange={(e) =>
                updateFilters({
                  size: Number(e.target.value) as WantedSize,
                  page: 0,
                })
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
            >
              {VALID_SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-amber-500/50 hover:text-white"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      {/* Contenedor estable con altura mínima reservada para evitar saltos de layout */}
      <div className="min-h-[480px]">
        {loading ? (
          <Loading message="Consultando carteles de Se Busca…" />
        ) : error ? (
          <ErrorState
            title="Error al cargar los carteles"
            message={error}
            onRetry={retry}
          />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            title="Sin resultados"
            message="No se encontraron carteles que coincidan con los filtros seleccionados."
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="cursor-pointer rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                >
                  Restablecer filtros
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Grilla de carteles */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.content.map((item) => (
                <Link
                  key={item.id}
                  to={`/wanted/${item.id}`}
                  state={{ from: location.pathname + location.search }}
                  className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-amber-500/60 hover:bg-slate-900"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${
                          STATUS_BADGE[item.status]
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="text-xs font-medium text-amber-400/90">
                        Amenaza {"★".repeat(item.threatLevel)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-500/80">
                        WANTED · DEAD OR ALIVE
                      </p>
                      <h2 className="mt-0.5 text-lg font-bold text-white group-hover:text-amber-400">
                        {item.name}
                      </h2>
                      <p className="text-xs italic text-slate-400">
                        &ldquo;{item.epithet}&rdquo;
                      </p>
                    </div>

                    <div className="mt-4 space-y-1 text-xs text-slate-300">
                      <p>
                        <span className="text-slate-500">Tripulación:</span>{" "}
                        {item.crew ? item.crew.name : "Sin tripulación"}
                      </p>
                      <p>
                        <span className="text-slate-500">Rol:</span> {item.role}
                      </p>
                      <p>
                        <span className="text-slate-500">Fruta:</span>{" "}
                        {item.devilFruit
                          ? `${item.devilFruit.name} (${item.devilFruit.type})`
                          : "Ninguna"}
                      </p>
                      <p>
                        <span className="text-slate-500">Última isla:</span>{" "}
                        {item.lastSeenIsland}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                    <span className="font-mono text-lg font-extrabold text-amber-400">
                      {berries(item.bounty)}
                    </span>
                    <span className="text-xs font-semibold text-amber-300 group-hover:underline">
                      Ver cartel →
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Controles de paginación */}
            <nav
              aria-label="Paginación de carteles"
              className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 sm:flex-row"
            >
              <p className="text-xs text-slate-400">
                Página <span className="font-bold text-white">{data.page + 1}</span> de{" "}
                <span className="font-bold text-white">{Math.max(1, data.totalPages)}</span>{" "}
                ({data.totalElements} carteles en total)
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={parsed.page <= 0}
                  onClick={() => updateFilters({ page: 0 })}
                  className="cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  « Primera
                </button>
                <button
                  type="button"
                  disabled={parsed.page <= 0}
                  onClick={() => updateFilters({ page: Math.max(0, parsed.page - 1) })}
                  className="cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  disabled={parsed.page + 1 >= data.totalPages}
                  onClick={() => updateFilters({ page: parsed.page + 1 })}
                  className="cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente →
                </button>
                <button
                  type="button"
                  disabled={parsed.page + 1 >= data.totalPages}
                  onClick={() =>
                    updateFilters({ page: Math.max(0, data.totalPages - 1) })
                  }
                  className="cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Última »
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
