export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-100 animate-pulse ${className}`}>
      <div className="h-4 w-24 bg-slate-200 rounded mt-4 ml-4" />
      <div className="h-8 w-20 bg-slate-200 rounded mt-3 ml-4 mb-4" />
    </div>
  );
}

export function SkeletonReportCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
