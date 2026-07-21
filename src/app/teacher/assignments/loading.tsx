export default function AssignmentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-16 rounded-2xl bg-slate-100" />
      <div className="h-64 rounded-3xl bg-slate-100" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="h-72 rounded-3xl bg-slate-100" />)}
      </div>
    </div>
  );
}
