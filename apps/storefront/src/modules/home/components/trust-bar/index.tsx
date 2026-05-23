const SIGNALS = [
  "Globally sourced rarities",
  "First access to the most coveted drops",
  "Direct from cult producers across 3 continents",
  "Strictly by application or member referral",
]

const TrustBar = () => {
  return (
    <div className="w-full border-y border-hg-border bg-hg-surface/50 py-4 px-6">
      <div className="content-container grid grid-cols-2 small:grid-cols-4 gap-4">
        {SIGNALS.map((signal, i) => (
          <div key={signal} className="flex flex-col items-center text-center gap-2">
            {i > 0 && (
              <span className="hidden small:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-4 bg-hg-border" />
            )}
            <span className="text-xs small:text-sm text-hg-text-secondary font-medium">
              {signal}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TrustBar
