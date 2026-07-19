export default function AcademicBatchWorkspaceLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading batch academic workspace">
      <div className="h-5 w-36 rounded-lg bg-slate-100" />
      <div className="h-56 rounded-[28px] bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-36 rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-[620px] rounded-3xl bg-slate-100" />
      </div>
    </div>
  );
}
