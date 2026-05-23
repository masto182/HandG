import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { breweryLabel } from "@lib/util/brewery-label"

export default async function Footer({ isApproved = false }: { isApproved?: boolean }) {
  return (
    <footer className="bg-hg-surface-low pt-16 pb-10 border-t border-hg-border/30">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="grid grid-cols-1 small:grid-cols-4 gap-16 mb-16">
          <div>
            <span className="text-xl font-black tracking-tighter text-hg-gold mb-4 block">
              HOPS &amp; GLORY
            </span>
            <p className="text-sm text-hg-text-secondary leading-relaxed">
              For the few who strive for the very best.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-hg-text mb-6">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <LocalizedClientLink href="/store" className="text-sm text-hg-text-secondary hover:text-hg-gold transition-colors">
                  The Collection
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/breweries" className="text-sm text-hg-text-secondary hover:text-hg-gold transition-colors">
                  {breweryLabel(isApproved)}
                </LocalizedClientLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-hg-text mb-6">
              Support
            </h4>
            <ul className="space-y-2">
              {isApproved && (
                <li>
                  <LocalizedClientLink href="/shipping" className="text-sm text-hg-text-secondary hover:text-hg-gold transition-colors">
                    Delivery Standards
                  </LocalizedClientLink>
                </li>
              )}
              <li>
                <a href="mailto:hello@example.com" className="text-sm text-hg-text-secondary hover:text-hg-gold transition-colors">
                  Contact Concierge
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-hg-text mb-6">
              Connect
            </h4>
            <div className="flex gap-4">
              <a href={process.env.NEXT_PUBLIC_BASE_URL || "https://example.com"} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center border border-hg-border rounded-full text-hg-text hover:border-hg-gold hover:text-hg-gold transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </a>
              <a href="https://instagram.com/example" target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center border border-hg-border rounded-full text-hg-text hover:border-hg-gold hover:text-hg-gold transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12l1.4 7 7.6-7L6 5.5"/><path d="M20 12l-1.4-7-7.6 7L18 18.5"/></svg>
              </a>
              <a href="mailto:hello@example.com" className="w-10 h-10 flex items-center justify-center border border-hg-border rounded-full text-hg-text hover:border-hg-gold hover:text-hg-gold transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-hg-border/20 flex flex-col small:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-hg-text-secondary/60 uppercase tracking-[0.15em]">
            &copy; HOPS &amp; GLORY. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-6">
            <span className="text-[10px] text-hg-text-secondary/60 uppercase tracking-[0.15em]">
              MEMBERS ONLY
            </span>
            <span className="text-[10px] text-hg-text-secondary/60 uppercase tracking-[0.15em]">
              EST. 2024
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
