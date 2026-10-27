import { api } from "../api/api";
import type { NewsFeed, NewsFilters, NewsItem, NewsStatus } from "../types/api";

export async function getNewsFeed(cursor: string | null, filters: NewsFilters, signal?: AbortSignal) {
  const params: Record<string, string | number> = { limit: 20 };
  if (cursor) params.cursor = cursor;
  if (filters.type) params.type = filters.type;
  if (filters.priority) params.priority = filters.priority;
  if (filters.status) params.status = filters.status;
  const res = await api.get<NewsFeed>("/news/feed", { params, signal });
  return res.data;
}

export async function getNewsById(id: string, signal?: AbortSignal) {
  const res = await api.get<NewsItem>(`/news/${id}`, { signal });
  return res.data;
}

export async function updateNewsStatus(id: string, status: Exclude<NewsStatus, "RUMOR">) {
  const res = await api.patch<NewsItem>(`/news/${id}/status`, { status });
  return res.data;
}