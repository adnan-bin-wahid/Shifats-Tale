export default function StudentProgressPrintLoading() {
  return (
    <div className="min-h-screen bg-white p-8" aria-busy="true" aria-label="Preparing print document">
      <div className="mx-auto min-h-[1000px] max-w-[210mm] animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}
