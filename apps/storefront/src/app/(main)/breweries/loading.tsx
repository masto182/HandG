export default function BreweriesLoading() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-24 pb-20 min-h-screen">
      <header className="py-16">
        <div className="h-12 w-48 bg-hg-surface rounded-lg animate-pulse mb-4" />
        <div className="h-5 w-80 bg-hg-surface rounded animate-pulse" />
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl overflow-hidden border border-hg-border/50 bg-hg-surface"
          >
            <div className="h-48 w-full bg-hg-surface-dim animate-pulse" />
            <div className="p-6">
              <div className="flex justify-between mb-3">
                <div className="h-6 w-32 bg-hg-border/30 rounded animate-pulse" />
                <div className="h-4 w-20 bg-hg-border/30 rounded animate-pulse" />
              </div>
              <div className="h-4 w-full bg-hg-border/30 rounded animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-hg-border/30 rounded animate-pulse mb-6" />
              <div className="pt-6 border-t border-hg-border/30 flex justify-between">
                <div className="flex gap-3">
                  <div className="h-5 w-5 bg-hg-border/30 rounded animate-pulse" />
                  <div className="h-5 w-5 bg-hg-border/30 rounded animate-pulse" />
                  <div className="h-5 w-5 bg-hg-border/30 rounded animate-pulse" />
                </div>
                <div className="h-8 w-28 bg-hg-border/30 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
