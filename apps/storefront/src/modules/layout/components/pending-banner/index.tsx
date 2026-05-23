const PendingBanner = () => {
  return (
    <div className="w-full bg-hg-gold/10 border-b border-hg-gold/30 py-3 px-6">
      <div className="content-container flex items-center justify-center gap-3">
        <span className="w-2 h-2 rounded-lg bg-hg-gold animate-pulse" />
        <p className="text-sm text-hg-gold font-medium">
          Your application is under review — we&apos;ll notify you by email when there&apos;s an update.
        </p>
      </div>
    </div>
  )
}

export default PendingBanner
