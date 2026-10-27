import { useEffect, useState } from "react";
import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getNewsById, updateNewsStatus } from "../services/news.service";
import { getApiError } from "../api/api";
import type { NewsItem } from "../types/api";
import type { NewsOutletContext } from "./NewsPage";

export default function NewsDetailModal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { updateItem } = useOutletContext<NewsOutletContext>();

  const [news, setNews] = useState<NewsItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoadError(null);
    getNewsById(id, controller.signal)
      .then(setNews)
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setLoadError(getApiError(e)?.message ?? "Error al cargar");
      });
    return () => controller.abort();
  }, [id, reload]);

  const close = () => navigate({ pathname: "/news", search: location.search });

  const verify = async (status: "CONFIRMED" | "DEBUNKED") => {
    if (!news) return;
    setSaving(true);
    setActionError(null);
    setOkMsg(null);
    try {
      const updated = await updateNewsStatus(news.id, status);
      setNews(updated);
      updateItem(updated); // reflejar en el feed
      setOkMsg(status === "CONFIRMED" ? "Noticia confirmada ✅" : "Noticia desmentida ❌");
    } catch (e) {
      setActionError(getApiError(e)?.message ?? "No se pudo verificar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={close}>
      <div className="max-h-[85vh] w-full max-w-xl overflow-auto rounded-lg bg-slate-900 p-6 text-white"
        onClick={(e) => e.stopPropagation()}>
        <button onClick={close} className="float-right rounded border px-2">✕</button>

        {loadError ? (
          <div>
            <p className="text-red-400">{loadError}</p>
            <button onClick={() => setReload((r) => r + 1)} className="mt-2 rounded bg-blue-600 px-3 py-1">Reintentar</button>
          </div>
        ) : !news ? (
          <p>Cargando…</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm opacity-70">{news.type} · {news.priority} · <b>{news.status}</b></p>
            <h2 className="text-xl font-bold">{news.title}</h2>
            {news.body && <p>{news.body}</p>}

            {news.status === "RUMOR" && (
              <div className="flex gap-2">
                <button disabled={saving} onClick={() => void verify("CONFIRMED")}
                  className="rounded bg-green-600 px-3 py-1 disabled:opacity-50">
                  {saving ? "Guardando…" : "Confirmar"}
                </button>
                <button disabled={saving} onClick={() => void verify("DEBUNKED")}
                  className="rounded bg-red-600 px-3 py-1 disabled:opacity-50">
                  {saving ? "Guardando…" : "Desmentir"}
                </button>
              </div>
            )}
            {okMsg && <p className="text-green-400">{okMsg}</p>}
            {actionError && <p className="text-red-400">{actionError} — puedes reintentar.</p>}
          </div>
        )}
      </div>
    </div>
  );
}