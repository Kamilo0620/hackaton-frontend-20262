interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Error en la travesía',
  message = 'No se pudo obtener la información del servidor.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-xl border border-red-500/40 bg-red-950/30 p-8 text-center text-red-100"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-xl font-bold text-red-400">
        !
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-lg font-semibold text-red-200">{title}</h3>
        <p className="text-sm text-red-300/90">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export default ErrorState;
