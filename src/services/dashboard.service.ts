import { api } from "../api/api";
import type { DashboardSummary, LogPose } from "../types/api";

export async function getDashboardSummary(signal?: AbortSignal) {
  const res = await api.get<DashboardSummary>("/dashboard/summary", { signal });
  return res.data;
}

export async function getLogPose(signal?: AbortSignal) {
  const res = await api.get<LogPose>("/log-pose", { signal });
  return res.data;
}
