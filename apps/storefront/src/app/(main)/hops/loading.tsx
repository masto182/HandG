export default function HopsLoading() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-24 pb-20 min-h-screen">
      <header className="py-16">
        <div className="h-4 w-20 bg-hg-surface rounded animate-pulse mb-3" />
        <div className="h-12 w-32 bg-hg-surface rounded-lg animate-pulse mb-4" />
        <div className="h-5 w-80 bg-hg-surface rounded animate-pulse" />
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-hg-border/50 bg-hg-surface p-5"
          >
            <div className="flex justify-between mb-3">
              <div className="h-6 w-28 bg-hg-border/30 rounded animate-pulse" />
              <div className="h-4 w-16 bg-hg-border/30 rounded animate-pulse" />
            </div>
            <div className="flex gap-1.5 mb-4">
              <div className="h-5 w-16 bg-hg-border/30 rounded-full animate-pulse" />
              <div className="h-5 w-20 bg-hg-border/30 rounded-full animate-pulse" />
              <div className="h-5 w-14 bg-hg-border/30 rounded-full animate-pulse" />
            </div>
            <div className="pt-4 border-t border-hg-border/30 flex justify-between">
              <div className="h-4 w-20 bg-hg-border/30 rounded animate-pulse" />
              <div className="h-4 w-24 bg-hg-border/30 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
