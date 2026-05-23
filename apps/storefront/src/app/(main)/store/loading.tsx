export default function StoreLoading() {
  return (
    <div className="flex flex-col small:flex-row small:items-start py-6 content-container">
      <div className="hidden small:block w-[240px] flex-shrink-0 pr-8">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 w-16 bg-hg-surface rounded animate-pulse mb-3" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 w-full bg-hg-surface rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full">
        <div className="h-8 w-32 bg-hg-surface rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-hg-surface border border-hg-border rounded-lg overflow-hidden">
              <div className="aspect-square bg-hg-border/30 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 bg-hg-border/30 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-hg-border/30 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
