export default function StudentProgressPreviewLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Preparing report preview">
      <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
      <div className="min-h-[900px] animate-pulse rounded-[28px] bg-slate-100" />
    </div>
  );
}
