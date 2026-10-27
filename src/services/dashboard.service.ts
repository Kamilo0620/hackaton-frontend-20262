import { api } from "../api/api";
import type { DashboardSummary } from "../types/api";

export async function getDashboardSummary(signal?: AbortSignal) {
  const res = await api.get<DashboardSummary>("/dashboard/summary", { signal });
  return res.data;
}