interface LoadingProps {
  message?: string;
}

export function Loading({ message = 'Cargando datos de la consola...' }: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-slate-300"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500/30 border-t-amber-400" />
      <p className="text-sm font-medium tracking-wide text-slate-300">{message}</p>
    </div>
  );
}

export default Loading;
