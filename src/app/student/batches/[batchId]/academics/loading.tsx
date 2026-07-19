export default function StudentBatchAcademicsLoading() {
  return (
    <div className="mx-auto max-w-[1500px] animate-pulse space-y-7 pb-12">
      <div className="h-4 w-56 rounded bg-slate-100" />
      <div className="h-80 rounded-[30px] bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <div className="h-[520px] rounded-[26px] bg-slate-100" />
        <div className="h-[680px] rounded-[26px] bg-slate-100" />
      </div>
    </div>
  );
}

