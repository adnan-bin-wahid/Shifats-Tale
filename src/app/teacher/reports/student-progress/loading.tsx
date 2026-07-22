export default function StudentProgressReportLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading student progress report">
      <div className="h-8 w-44 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-56 animate-pulse rounded-[30px] bg-slate-200" />
      <div className="h-36 animate-pulse rounded-3xl bg-slate-100" />
    </div>
  );
}
