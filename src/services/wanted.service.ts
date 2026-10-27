import { api } from "../api/api";
import type { Crew, WantedDetail, WantedPage, WantedQueryParams } from "../types/api";

export async function getCrews(signal?: AbortSignal): Promise<Crew[]> {
  const res = await api.get<Crew[]>("/crews", { signal });
  return res.data;
}

export async function getWantedList(
  params: WantedQueryParams,
  signal?: AbortSignal
): Promise<WantedPage> {
  const cleanParams: Record<string, string | number> = {};

  if (params.page !== undefined) cleanParams.page = params.page;
  if (params.size !== undefined) cleanParams.size = params.size;
  if (params.status) cleanParams.status = params.status;
  if (params.crewId) cleanParams.crewId = params.crewId;
  if (params.fruit) cleanParams.fruit = params.fruit;
  if (params.q && params.q.trim() !== "") cleanParams.q = params.q.trim();
  if (params.sort) cleanParams.sort = params.sort;

  const res = await api.get<WantedPage>("/wanted", {
    params: cleanParams,
    signal,
  });
  return res.data;
}

export async function getWantedById(
  id: string,
  signal?: AbortSignal
): Promise<WantedDetail> {
  const res = await api.get<WantedDetail>(`/wanted/${encodeURIComponent(id)}`, {
    signal,
  });
  return res.data;
}
