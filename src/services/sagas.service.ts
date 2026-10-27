import type { NavigateFunction } from "react-router-dom";
import { api } from "../api/api";
import type { SagaStory, SagaSummary } from "../types/api";

export async function getSagas(signal?: AbortSignal): Promise<SagaSummary[]> {
  const res = await api.get<SagaSummary[]>("/sagas", { signal });
  return res.data;
}

export async function getSagaStory(
  id: string,
  signal?: AbortSignal
): Promise<SagaStory> {
  const res = await api.get<SagaStory>(`/sagas/${encodeURIComponent(id)}/story`, {
    signal,
  });
  return res.data;
}

interface DocumentWithViewTransition {
  startViewTransition?: (callback: () => void) => unknown;
}

export function navigateWithViewTransition(
  navigate: NavigateFunction,
  to: string
): void {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const doc = document as unknown as DocumentWithViewTransition;

  if (!prefersReducedMotion && typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => {
      navigate(to);
    });
  } else {
    navigate(to);
  }
}
