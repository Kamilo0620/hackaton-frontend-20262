import type { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  title = 'Sin resultados',
  message,
  description,
  action,
}: EmptyStateProps) {
  const displayMessage =
    message ?? description ?? 'No hay registros disponibles en este momento.';

  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-300">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800/80 text-lg font-semibold text-amber-400">
        0
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        <p className="text-sm text-slate-400">{displayMessage}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
