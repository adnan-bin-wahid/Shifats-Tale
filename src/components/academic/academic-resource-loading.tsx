export function AcademicResourceLoading() {
  return (
    <div className="animate-pulse space-y-7" aria-busy="true" aria-label="Loading academic content">
      <div className="space-y-3">
        <div className="h-4 w-36 rounded bg-slate-100" />
        <div className="h-9 w-72 max-w-full rounded-xl bg-slate-200" />
        <div className="h-4 w-[420px] max-w-full rounded bg-slate-100" />
      </div>
      <div className="h-20 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="h-10 rounded-xl bg-slate-100" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-56 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="h-8 w-8 rounded-xl bg-slate-100" />
            <div className="mt-8 h-5 w-3/4 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-full rounded bg-slate-100" />
            <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
