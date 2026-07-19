export default function StudentAcademicsLoading() {
  return (
    <div className="mx-auto max-w-[1500px] animate-pulse space-y-8 pb-12">
      <div className="space-y-3">
        <div className="h-8 w-64 rounded-xl bg-slate-200" />
        <div className="h-4 w-full max-w-xl rounded-lg bg-slate-100" />
      </div>
      <div className="h-72 rounded-[30px] bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-36 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="h-80 rounded-[26px] bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

