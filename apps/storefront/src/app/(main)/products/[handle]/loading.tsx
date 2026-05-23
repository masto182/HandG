export default function ProductLoading() {
  return (
    <div className="content-container flex flex-col small:flex-row small:items-start py-6">
      <div className="flex flex-col small:max-w-[300px] w-full py-8 gap-y-4">
        <div className="h-4 w-24 bg-hg-surface rounded animate-pulse" />
        <div className="h-8 w-48 bg-hg-surface rounded animate-pulse" />
        <div className="flex gap-3">
          <div className="h-7 w-16 bg-hg-surface rounded-lg animate-pulse" />
          <div className="h-7 w-20 bg-hg-surface rounded-lg animate-pulse" />
        </div>
        <div className="space-y-2 mt-4">
          <div className="h-3 w-full bg-hg-surface rounded animate-pulse" />
          <div className="h-3 w-full bg-hg-surface rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-hg-surface rounded animate-pulse" />
        </div>
      </div>
      <div className="block w-full relative px-4">
        <div className="aspect-square bg-hg-surface rounded-lg animate-pulse" />
      </div>
      <div className="flex flex-col small:max-w-[300px] w-full py-8 gap-y-4">
        <div className="h-6 w-20 bg-hg-surface rounded animate-pulse" />
        <div className="h-12 w-full bg-hg-surface rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
