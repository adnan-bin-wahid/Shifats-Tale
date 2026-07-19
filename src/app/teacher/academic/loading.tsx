export default function AcademicControlCenterLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-label="Loading academic control center">
      <div className="space-y-3 border-b border-border/40 pb-6">
        <div className="h-8 w-72 rounded-xl bg-slate-200" />
        <div className="h-4 w-full max-w-xl rounded-lg bg-slate-100" />
      </div>
      <div className="h-72 rounded-[28px] bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-28 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-72 rounded-3xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
