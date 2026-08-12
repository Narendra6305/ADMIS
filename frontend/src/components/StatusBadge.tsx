const STATUS_STYLES: Record<string, string> = {
  INGESTING: 'bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse shadow-[0_0_12px_rgba(14,165,233,0.2)]',
  PROCESSING: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  DRAFT: 'bg-slate-700/50 text-slate-300 border border-slate-600/50',
  PUBLISHED: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
  PENDING_DELETE: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
  PURGED: 'bg-slate-800/80 text-slate-500 border border-slate-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase backdrop-blur-md transition-all ${STATUS_STYLES[status] || 'bg-slate-700 text-slate-300'}`}>
      {(status === 'PROCESSING' || status === 'INGESTING') && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'INGESTING' ? 'bg-sky-400' : 'bg-amber-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'INGESTING' ? 'bg-sky-500' : 'bg-amber-500'}`}></span>
        </span>
      )}
      {status.replace(/_/g, ' ')}
    </span>
  );
}
