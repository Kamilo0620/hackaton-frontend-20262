import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { getApiError } from "../api/api";
import ErrorState from "../components/ErrorState";
import Loading from "../components/Loading";
import { getSagaStory, navigateWithViewTransition } from "../services/sagas.service";
import type { SagaStage, SagaStory, StageMetric } from "../types/api";

function resolveStageIndex(
  stages: SagaStage[],
  stageParam: string | null,
  hash: string
): number {
  if (stages.length === 0) return 0;
  const raw = (stageParam ?? hash.replace(/^#/, "")).trim();
  if (!raw) return 0;

  const bySlugOrId = stages.findIndex(
    (s) =>
      s.slug.toLowerCase() === raw.toLowerCase() ||
      s.id.toLowerCase() === raw.toLowerCase()
  );
  if (bySlugOrId >= 0) return bySlugOrId;

  const asOrder = Number(raw);
  if (Number.isInteger(asOrder)) {
    const byOrder = stages.findIndex((s) => s.order === asOrder);
    if (byOrder >= 0) return byOrder;
  }

  return 0;
}

function formatMetricValue(metric: StageMetric): string {
  if (metric.key === "bountyPool" || metric.unit === "berries") {
    return `฿ ${metric.value.toLocaleString("es-PE")}`;
  }
  if (metric.unit === "%" || metric.unit === "/10") {
    return `${metric.value.toLocaleString("es-PE")}${metric.unit}`;
  }
  return `${metric.value.toLocaleString("es-PE")} ${metric.unit}`;
}

export default function SagaStoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [story, setStory] = useState<SagaStory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [scrollRatio, setScrollRatio] = useState(0);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  const supportsCssScrollTimeline = useMemo(
    () =>
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline", "scroll()"),
    []
  );

  const requestKey = useMemo(() => `${id ?? ""}:${reload}`, [id, reload]);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const loading = resolvedKey !== requestKey;

  const stageElementsRef = useRef<(HTMLElement | null)[]>([]);
  const programmaticScrollUntilRef = useRef<number>(0);
  const initialStageHandledForSagaRef = useRef<string | null>(null);

  // Listen to prefers-reduced-motion changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  // Fetch /sagas/:id/story
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    getSagaStory(id, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        const orderedStages = [...res.stages].sort((a, b) => a.order - b.order);
        setStory({
          ...res,
          stages: orderedStages,
        });
        setError(null);
        setNotFound(false);
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
          setNotFound(false);
          setError(null);
        } else if (apiErr?.status === 404 || apiErr?.code === "NOT_FOUND") {
          setNotFound(true);
          setLockedMessage(null);
          setError(null);
        } else {
          setNotFound(false);
          setLockedMessage(null);
          setError(
            apiErr?.message ??
              (e instanceof Error ? e.message : "No se pudo cargar la historia de la saga.")
          );
        }
        setResolvedKey(requestKey);
      });

    return () => controller.abort();
  }, [id, requestKey]);

  const stages = useMemo(() => story?.stages ?? [], [story]);

  const activeStageIndex = useMemo(
    () => resolveStageIndex(stages, searchParams.get("stage"), location.hash),
    [stages, searchParams, location.hash]
  );

  const activeStage: SagaStage | undefined = stages[activeStageIndex] ?? stages[0];

  const goToStage = useCallback(
    (
      index: number,
      options?: { focusElement?: boolean; scrollBehavior?: ScrollBehavior }
    ) => {
      if (stages.length === 0) return;
      const clampedIndex = Math.max(0, Math.min(stages.length - 1, index));
      const targetStage = stages[clampedIndex];
      if (!targetStage) return;

      programmaticScrollUntilRef.current = Date.now() + 850;
      setSearchParams({ stage: targetStage.slug }, { replace: true });

      const el = stageElementsRef.current[clampedIndex];
      if (el) {
        const behavior =
          options?.scrollBehavior ?? (prefersReducedMotion ? "auto" : "smooth");
        el.scrollIntoView({ behavior, block: "center" });
        if (options?.focusElement) {
          el.focus({ preventScroll: true });
        }
      }
    },
    [prefersReducedMotion, setSearchParams, stages]
  );

  // On initial load of a saga, jump to the stage indicated in the URL (or set stage 1 in URL)
  useEffect(() => {
    if (!story || stages.length === 0) return;
    if (initialStageHandledForSagaRef.current === story.saga.id) return;
    initialStageHandledForSagaRef.current = story.saga.id;

    const rawParam = searchParams.get("stage") ?? location.hash.replace(/^#/, "");
    const targetIdx = resolveStageIndex(stages, searchParams.get("stage"), location.hash);
    const targetStage = stages[targetIdx];
    if (!targetStage) return;

    if (searchParams.get("stage") !== targetStage.slug) {
      setSearchParams({ stage: targetStage.slug }, { replace: true });
    }

    if (rawParam && targetIdx >= 0) {
      programmaticScrollUntilRef.current = Date.now() + 900;
      requestAnimationFrame(() => {
        const el = stageElementsRef.current[targetIdx];
        if (el) {
          el.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center",
          });
        }
      });
    }
  }, [
    story,
    stages,
    searchParams,
    location.hash,
    prefersReducedMotion,
    setSearchParams,
  ]);

  // IntersectionObserver to activate stages on scroll and sync URL
  useEffect(() => {
    if (stages.length === 0) return;

    const ratios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idxAttr = entry.target.getAttribute("data-stage-index");
          if (idxAttr !== null) {
            const idx = Number(idxAttr);
            ratios.set(idx, entry.isIntersecting ? entry.intersectionRatio : 0);
          }
        }

        if (Date.now() < programmaticScrollUntilRef.current) {
          return;
        }

        let bestIdx = -1;
        let bestRatio = 0;
        for (const [idx, ratio] of ratios.entries()) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        }

        if (bestIdx >= 0 && bestRatio >= 0.2) {
          const detectedStage = stages[bestIdx];
          if (detectedStage && searchParams.get("stage") !== detectedStage.slug) {
            setSearchParams({ stage: detectedStage.slug }, { replace: true });
          }
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -25% 0px",
        threshold: [0.15, 0.35, 0.55, 0.75],
      }
    );

    for (const el of stageElementsRef.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [stages, searchParams, setSearchParams]);

  // JS Scroll Progress fallback (for browsers without CSS scroll-driven animations)
  useEffect(() => {
    let rafId = 0;
    const updateScroll = () => {
      const docEl = document.documentElement;
      const maxScroll = docEl.scrollHeight - docEl.clientHeight;
      if (maxScroll <= 0) {
        setScrollRatio(1);
      } else {
        setScrollRatio(Math.min(1, Math.max(0, window.scrollY / maxScroll)));
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateScroll);
    };

    updateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [story]);

  // Keyboard navigation between stages without losing content
  useEffect(() => {
    if (stages.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        goToStage(activeStageIndex + 1, { focusElement: true });
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        goToStage(activeStageIndex - 1, { focusElement: true });
      } else if (e.key === "Home") {
        e.preventDefault();
        goToStage(0, { focusElement: true });
      } else if (e.key === "End") {
        e.preventDefault();
        goToStage(stages.length - 1, { focusElement: true });
      } else if (/^[1-9]$/.test(e.key)) {
        const num = Number(e.key) - 1;
        if (num < stages.length) {
          e.preventDefault();
          goToStage(num, { focusElement: true });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStageIndex, goToStage, stages.length]);

  const retry = useCallback(() => {
    setError(null);
    setNotFound(false);
    setLockedMessage(null);
    setReload((r) => r + 1);
  }, []);

  const handleBackToSagas = (e: MouseEvent<HTMLAnchorElement>) => {
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
    navigateWithViewTransition(navigate, "/sagas");
  };

  if (loading) {
    return <Loading message="Abriendo bitácora del Poneglyph y trazando el mapa del Grand Line…" />;
  }

  if (lockedMessage) {
    return (
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
    );
  }

  if (notFound) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-8 text-center">
        <h2 className="text-xl font-bold text-white">Saga no encontrada (404)</h2>
        <p className="mt-2 text-sm text-slate-300">
          El Poneglyph solicitado no existe en el workspace de tu tripulación.
        </p>
        <Link
          to="/sagas"
          viewTransition
          onClick={handleBackToSagas}
          className="mt-4 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
        >
          Volver a Sagas
        </Link>
      </div>
    );
  }

  if (error || !story || !activeStage) {
    return (
      <ErrorState
        title="No se pudo cargar la historia de la saga"
        message={error ?? "Error desconocido."}
        onRetry={retry}
      />
    );
  }

  const palette = activeStage.palette;
  const stageProgressPercent = Math.round(
    ((activeStageIndex + 1) / Math.max(1, stages.length)) * 100
  );

  // Polyline points for the entire route and the traversed route up to activeStageIndex
  const fullRoutePoints = stages
    .map((s) => `${s.island.x},${s.island.y}`)
    .join(" ");

  const traversedRoutePoints = stages
    .slice(0, activeStageIndex + 1)
    .map((s) => `${s.island.x},${s.island.y}`)
    .join(" ");

  return (
    <div
      style={{
        backgroundColor: palette.background,
        color: palette.text,
        viewTransitionName: `saga-card-${story.saga.id}`,
      }}
      className="saga-theme-transition relative -mx-4 rounded-2xl border p-4 shadow-2xl sm:mx-0 sm:p-6 lg:p-8"
    >
      {/* Barra superior de progreso del recorrido (CSS Scroll-driven + fallback equivalente) */}
      <div
        aria-label={`Progreso de la saga: etapa ${activeStage.order} de ${stages.length} (${stageProgressPercent}%)`}
        className="sticky top-14 z-20 mb-6 overflow-hidden rounded-xl border p-3 backdrop-blur-md"
        style={{
          backgroundColor: `${palette.surface}ee`,
          borderColor: `${palette.primary}55`,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <Link
              to="/sagas"
              viewTransition
              onClick={handleBackToSagas}
              style={{
                borderColor: `${palette.primary}66`,
                color: palette.text,
              }}
              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-semibold transition hover:opacity-80"
            >
              ← Sagas
            </Link>
            <span className="font-bold">
              Etapa {activeStage.order} de {stages.length}:{" "}
              <span style={{ color: palette.primary }}>{activeStage.title}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono font-bold" style={{ color: palette.accent }}>
              {stageProgressPercent}% recorrido
            </span>
            <div className="flex items-center gap-1" role="group" aria-label="Controles de etapa">
              <button
                type="button"
                disabled={activeStageIndex <= 0}
                onClick={() => goToStage(activeStageIndex - 1, { focusElement: true })}
                style={{
                  borderColor: `${palette.primary}55`,
                  color: palette.text,
                }}
                aria-label="Etapa anterior (Flecha arriba o izquierda)"
                className="cursor-pointer rounded border px-2 py-0.5 text-xs font-bold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ↑ Anterior
              </button>
              <button
                type="button"
                disabled={activeStageIndex + 1 >= stages.length}
                onClick={() => goToStage(activeStageIndex + 1, { focusElement: true })}
                style={{
                  borderColor: `${palette.primary}55`,
                  color: palette.text,
                }}
                aria-label="Siguiente etapa (Flecha abajo o derecha)"
                className="cursor-pointer rounded border px-2 py-0.5 text-xs font-bold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente ↓
              </button>
            </div>
          </div>
        </div>

        {/* Barra de progreso por etapas + barra de scroll */}
        <div className="mt-2.5 space-y-1.5">
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: `${palette.background}99` }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${stageProgressPercent}%`,
                backgroundColor: palette.primary,
              }}
            />
          </div>

          <div
            className="h-1 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: `${palette.background}66` }}
            title="Progreso continuo de lectura"
          >
            <div
              className={
                supportsCssScrollTimeline && !prefersReducedMotion
                  ? "saga-css-scroll-progress h-full w-full rounded-full"
                  : "h-full rounded-full"
              }
              style={{
                backgroundColor: palette.accent,
                ...(supportsCssScrollTimeline && !prefersReducedMotion
                  ? {}
                  : { width: `${Math.round(scrollRatio * 100)}%` }),
              }}
            />
          </div>
        </div>

        {/* Selector rápido de etapas (accesible por teclado y mouse) */}
        <nav
          aria-label="Etapas de la saga"
          className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1"
        >
          {stages.map((st, idx) => {
            const isCurrent = idx === activeStageIndex;
            const isVisited = idx <= activeStageIndex;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => goToStage(idx, { focusElement: true })}
                aria-current={isCurrent ? "step" : undefined}
                style={{
                  backgroundColor: isCurrent
                    ? palette.primary
                    : isVisited
                      ? `${palette.primary}33`
                      : `${palette.background}88`,
                  color: isCurrent ? palette.background : palette.text,
                  borderColor: isCurrent ? palette.primary : `${palette.primary}44`,
                }}
                className="cursor-pointer shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition"
              >
                {st.order}. {st.island.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Introducción de la Saga */}
      <header
        style={{
          backgroundColor: `${palette.surface}cc`,
          borderColor: `${palette.primary}44`,
        }}
        className="saga-theme-transition mb-8 rounded-2xl border p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            style={{
              backgroundColor: palette.background,
              color: palette.primary,
              borderColor: `${palette.primary}55`,
            }}
            className="rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wider"
          >
            Poneglyph · Saga #{story.saga.order}
          </span>
          <span className="text-xs opacity-80">
            Usa las teclas <kbd className="rounded border px-1.5 py-0.5 font-mono">↑</kbd>{" "}
            <kbd className="rounded border px-1.5 py-0.5 font-mono">↓</kbd> o el scroll para navegar entre islas
          </span>
        </div>

        <h1
          style={{ viewTransitionName: `saga-title-${story.saga.id}` }}
          className="mt-3 text-2xl font-black sm:text-4xl"
        >
          {story.saga.title}
        </h1>
        <p
          style={{ color: palette.primary }}
          className="mt-1 text-base font-semibold italic"
        >
          {story.saga.subtitle}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed opacity-90">
          {story.saga.intro}
        </p>
      </header>

      {/* Layout Scrollytelling: Mapa + Métricas persistentes (Sticky en Mobile y Desktop) + Etapas narrativas */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Columna Persistente: Mapa del Grand Line + Métricas de la Etapa Activa */}
        <aside
          aria-label="Mapa del Grand Line y métricas de la etapa activa"
          className="sticky top-40 z-10 space-y-4 lg:top-44 lg:col-span-7"
        >
          {/* Mapa SVG del Grand Line */}
          <div
            style={{
              backgroundColor: palette.surface,
              borderColor: `${palette.primary}66`,
            }}
            className="saga-theme-transition overflow-hidden rounded-2xl border-2 p-3 shadow-xl sm:p-4"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: palette.primary }}
                />
                <span className="font-bold uppercase tracking-wider">
                  Carta Náutica del Grand Line
                </span>
              </div>
              <span className="font-semibold" style={{ color: palette.accent }}>
                Isla actual: {activeStage.island.name} ({activeStage.island.x},{" "}
                {activeStage.island.y})
              </span>
            </div>

            <div
              className="relative w-full overflow-hidden rounded-xl border"
              style={{
                backgroundColor: palette.background,
                borderColor: `${palette.primary}33`,
              }}
            >
              <svg
                viewBox={`0 0 ${story.map.width} ${story.map.height}`}
                role="img"
                aria-label={`Mapa de ${story.saga.title}. Barco ubicado en ${activeStage.island.name}.`}
                className="block h-auto max-h-[38vh] w-full lg:max-h-[48vh]"
              >
                <defs>
                  <pattern
                    id="grand-line-grid"
                    width="100"
                    height="100"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 100 0 L 0 0 0 100"
                      fill="none"
                      stroke={palette.text}
                      strokeOpacity="0.08"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>

                {/* Cuadrícula oceánica y franja del Calm Belt */}
                <rect
                  x="0"
                  y="0"
                  width={story.map.width}
                  height={story.map.height}
                  fill="url(#grand-line-grid)"
                />
                <line
                  x1="0"
                  y1={story.map.height / 2}
                  x2={story.map.width}
                  y2={story.map.height / 2}
                  stroke={palette.primary}
                  strokeOpacity="0.18"
                  strokeDasharray="10 8"
                  strokeWidth="2"
                />

                {/* Ruta completa proyectada (línea punteada) */}
                {stages.length > 1 && (
                  <polyline
                    points={fullRoutePoints}
                    fill="none"
                    stroke={palette.text}
                    strokeOpacity="0.25"
                    strokeWidth="4"
                    strokeDasharray="8 8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Ruta recorrida hasta la etapa activa */}
                {activeStageIndex > 0 && (
                  <polyline
                    points={traversedRoutePoints}
                    fill="none"
                    stroke={palette.primary}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="saga-route-progress"
                  />
                )}

                {/* Islas de cada etapa */}
                {stages.map((st, idx) => {
                  const isVisited = idx <= activeStageIndex;
                  const isCurrent = idx === activeStageIndex;
                  const labelAbove = st.island.y > story.map.height * 0.55;

                  return (
                    <g
                      key={st.island.id}
                      onClick={() => goToStage(idx, { focusElement: true })}
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label={`Ir a etapa ${st.order}: ${st.island.name}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          goToStage(idx, { focusElement: true });
                        }
                      }}
                    >
                      {isCurrent && (
                        <circle
                          cx={st.island.x}
                          cy={st.island.y}
                          r="24"
                          fill={palette.accent}
                          fillOpacity="0.22"
                          stroke={palette.accent}
                          strokeWidth="2"
                        />
                      )}

                      <circle
                        cx={st.island.x}
                        cy={st.island.y}
                        r={isCurrent ? "13" : "9"}
                        fill={isVisited ? palette.primary : palette.surface}
                        stroke={isCurrent ? palette.accent : palette.text}
                        strokeWidth={isCurrent ? "3.5" : "2"}
                      />

                      <text
                        x={st.island.x}
                        y={st.island.y + 4}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill={isVisited ? palette.background : palette.text}
                      >
                        {st.order}
                      </text>

                      <g
                        transform={`translate(${st.island.x}, ${
                          labelAbove ? st.island.y - 26 : st.island.y + 30
                        })`}
                      >
                        <rect
                          x="-78"
                          y="-12"
                          width="156"
                          height="22"
                          rx="6"
                          fill={palette.surface}
                          fillOpacity="0.92"
                          stroke={isCurrent ? palette.primary : "transparent"}
                          strokeWidth="1.5"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight={isCurrent ? "800" : "600"}
                          fill={isCurrent ? palette.primary : palette.text}
                        >
                          {st.island.name}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Barco de la tripulación ubicado en la isla de la etapa activa */}
                <g
                  transform={`translate(${activeStage.island.x}, ${activeStage.island.y})`}
                  className="saga-ship-marker pointer-events-none"
                >
                  <g transform="translate(0, -24)">
                    {/* Casco del barco */}
                    <path
                      d="M -18 4 L 18 4 L 12 14 L -12 14 Z"
                      fill={palette.accent}
                      stroke={palette.background}
                      strokeWidth="2"
                    />
                    {/* Mástil y vela principal */}
                    <line
                      x1="0"
                      y1="-16"
                      x2="0"
                      y2="4"
                      stroke={palette.text}
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 0 -15 L 15 -5 L 0 1 Z"
                      fill={palette.primary}
                      stroke={palette.background}
                      strokeWidth="1.5"
                    />
                    {/* Bandera en el tope */}
                    <circle
                      cx="0"
                      cy="-17"
                      r="3"
                      fill={palette.accent}
                    />
                  </g>
                </g>
              </svg>
            </div>
          </div>

          {/* Métricas visibles de la etapa activa */}
          <section
            aria-live="polite"
            aria-label={`Métricas de la etapa ${activeStage.order}: ${activeStage.title}`}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {activeStage.metrics.map((metric) => (
              <div
                key={`${activeStage.id}-${metric.key}`}
                style={{
                  backgroundColor: palette.surface,
                  borderColor: `${palette.primary}55`,
                  color: palette.text,
                }}
                className="saga-theme-transition rounded-xl border p-3.5 shadow-md"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-75">
                  {metric.label}
                </p>
                <p
                  style={{ color: palette.primary }}
                  className="mt-1 font-mono text-base font-extrabold sm:text-lg"
                >
                  {formatMetricValue(metric)}
                </p>
              </div>
            ))}
          </section>
        </aside>

        {/* Columna de Capítulos / Etapas Narrativas activadas por scroll */}
        <div className="space-y-12 pb-24 lg:col-span-5">
          {stages.map((stage, idx) => {
            const isCurrent = idx === activeStageIndex;
            const stagePalette = stage.palette;

            return (
              <article
                key={stage.id}
                id={`stage-${stage.slug}`}
                ref={(el) => {
                  stageElementsRef.current[idx] = el;
                }}
                data-stage-index={idx}
                data-stage-slug={stage.slug}
                tabIndex={-1}
                onClick={() => {
                  if (idx !== activeStageIndex) {
                    goToStage(idx);
                  }
                }}
                style={{
                  backgroundColor: isCurrent
                    ? stagePalette.surface
                    : `${stagePalette.surface}b3`,
                  borderColor: isCurrent
                    ? stagePalette.primary
                    : `${stagePalette.primary}44`,
                  color: stagePalette.text,
                }}
                aria-current={isCurrent ? "step" : undefined}
                className={`saga-stage-scroll-card saga-theme-transition min-h-[52vh] rounded-2xl border-2 p-6 shadow-xl outline-none focus:ring-2 focus:ring-amber-400 sm:p-7 ${
                  isCurrent ? "scale-[1.01] shadow-2xl" : "opacity-80"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    style={{
                      backgroundColor: stagePalette.background,
                      color: stagePalette.primary,
                      borderColor: `${stagePalette.primary}66`,
                    }}
                    className="rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wider"
                  >
                    Etapa {stage.order} de {stages.length}
                  </span>

                  <span
                    style={{ color: stagePalette.accent }}
                    className="text-xs font-bold uppercase tracking-wide"
                  >
                    📍 {stage.island.name}
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-black sm:text-2xl">
                  {stage.title}
                </h2>

                <div className="mt-4 space-y-4 text-sm leading-relaxed sm:text-base">
                  {stage.narrative.map((paragraph, pIdx) => (
                    <p key={`${stage.id}-p-${pIdx}`} className="opacity-95">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Resumen compacto de métricas dentro de la tarjeta de etapa */}
                <div
                  style={{
                    backgroundColor: `${stagePalette.background}aa`,
                    borderColor: `${stagePalette.primary}33`,
                  }}
                  className="mt-6 grid grid-cols-2 gap-2.5 rounded-xl border p-3 text-xs"
                >
                  {stage.metrics.map((m) => (
                    <div key={`${stage.id}-inline-${m.key}`}>
                      <span className="block opacity-70">{m.label}</span>
                      <strong
                        style={{ color: stagePalette.primary }}
                        className="font-mono text-xs font-bold"
                      >
                        {formatMetricValue(m)}
                      </strong>
                    </div>
                  ))}
                </div>

                {/* Botones de navegación secuencial al pie de cada etapa */}
                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs font-semibold">
                  {idx > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToStage(idx - 1, { focusElement: true });
                      }}
                      style={{ color: stagePalette.primary }}
                      className="cursor-pointer hover:underline"
                    >
                      ← Etapa {idx}: {stages[idx - 1]?.island.name}
                    </button>
                  ) : (
                    <span className="opacity-50">Inicio de la travesía</span>
                  )}

                  {idx + 1 < stages.length ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToStage(idx + 1, { focusElement: true });
                      }}
                      style={{ color: stagePalette.accent }}
                      className="cursor-pointer font-bold hover:underline"
                    >
                      Etapa {idx + 2}: {stages[idx + 1]?.island.name} →
                    </button>
                  ) : (
                    <span
                      style={{ color: stagePalette.accent }}
                      className="font-bold"
                    >
                      ★ Fin de la Saga
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
