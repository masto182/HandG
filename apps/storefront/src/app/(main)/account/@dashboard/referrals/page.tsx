"use client"

import { useEffect, useState, type JSX } from "react"
import { getReferralData, ReferralData, ReferralStatus } from "@lib/data/referrals"
import { trackGoal } from "@lib/util/plausible"
import { shareReferral, type ShareChannel } from "@lib/util/share"
import {
  DEFAULT_REFERRAL_BODY,
  DEFAULT_REFERRAL_EMAIL_SUBJECT,
} from "@lib/util/share-defaults"

const STATUS_STYLES: Record<ReferralStatus, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  signed_up: "bg-secondary/10 text-secondary border-secondary/20",
  pending: "bg-outline/10 text-outline border-outline/20",
}

const STATUS_LABELS: Record<ReferralStatus, string> = {
  active: "Active",
  signed_up: "Signed Up",
  pending: "Pending",
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [stealthMode, setStealthMode] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    getReferralData().then((result) => {
      setData(result)
      setStealthMode(result?.stealth_mode ?? false)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mql = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    trackGoal("referral_sent", { channel: label, via: "clipboard" })
    setTimeout(() => setCopied(null), 2000)
  }

  const handleShare = async (channel?: ShareChannel) => {
    if (!data?.invite_link) return
    const result = await shareReferral({
      channel,
      link: data.invite_link,
      body: DEFAULT_REFERRAL_BODY,
      emailSubject: DEFAULT_REFERRAL_EMAIL_SUBJECT,
    })
    trackGoal("referral_sent", { channel: channel ?? "native", via: result })
    if (result === "clipboard") {
      setCopied(channel ?? "share")
      setTimeout(() => setCopied(null), 2000)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-[280px] bg-surface-container rounded-xl" />
        <div className="animate-pulse h-48 bg-surface-container rounded-xl" />
      </div>
    )
  }

  if (!data || !data.referral_code) {
    return <EmptyState />
  }

  const visibleHistory = showAll ? data.history : data.history.slice(0, 4)
  const remainingCount = data.total_history_count - 4

  return (
    <div className="w-full" data-testid="referrals-page-wrapper">
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-xl border border-outline-variant/30 min-h-[280px] flex flex-col justify-end p-6 md:p-10 group">
          <div className="absolute inset-0 z-0">
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-surface-container to-surface-container" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
          <div className="relative z-10">
            <span className="text-label-caps text-primary tracking-widest mb-2 block">REFERRAL PROGRAM</span>
            <h1 className="text-h2 md:text-h1 mb-4">Bring the right people in.</h1>
            <p className="text-body-lg text-on-surface-variant max-w-[500px]">
              Your referrals earn you 20% of their spend toward your VIP score. Expand the archive with fellow collectors.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-container/60 backdrop-blur-sm rounded-xl p-6 space-y-4 border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-label-caps text-on-surface-variant tracking-wider">YOUR UNIQUE REFERRAL CODE</span>
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
              <div className="flex-1 bg-surface-container-highest/20 border border-outline-variant/30 rounded-lg px-6 py-4 font-mono text-h3 tracking-widest text-center select-all">
                {data.referral_code}
              </div>
              <button
                onClick={() => copyToClipboard(data.invite_link || data.referral_code!, "link")}
                className="bg-primary text-on-primary font-bold px-6 py-4 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                {copied === "link" ? "Copied!" : "Copy link"}
              </button>
            </div>
            {isMobile ? (
              <div className="pt-2">
                <button
                  onClick={() => handleShare()}
                  className="w-full bg-surface-container-highest/30 border border-outline-variant/30 hover:border-primary/60 text-on-surface font-bold px-6 py-4 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center md:justify-start gap-6 pt-2">
                <ShareButton icon="twitter" label="X / Twitter" onClick={() => handleShare("twitter")} />
                <ShareButton icon="email" label="Email" onClick={() => handleShare("email")} />
                <ShareButton icon="facebook" label="Facebook" onClick={() => handleShare("facebook")} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-surface-elevated rounded-xl p-6 border border-outline-variant/20 flex flex-col justify-center">
              <div className="text-on-surface-variant text-label-caps tracking-wider mb-1">People referred</div>
              <div className="text-h2 font-bold text-primary">{data.stats.total_referrals}</div>
              <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.min((data.stats.total_referrals / 10) * 100, 100)}%` }} />
              </div>
              {data.stats.growth_last_month > 0 && (
                <p className="text-xs text-on-surface-variant mt-2">+{data.stats.growth_last_month} from last month</p>
              )}
            </div>
            <div className="bg-surface-elevated rounded-xl p-6 border border-outline-variant/20 flex flex-col justify-center">
              <div className="text-on-surface-variant text-label-caps tracking-wider mb-1">Network contribution</div>
              <div className="text-h2 font-bold text-secondary">{data.stats.network_contribution} points</div>
              {data.stats.contribution_value > 0 && (
                <p className="text-xs text-on-surface-variant mt-2">≈ ${data.stats.contribution_value.toFixed(2)} in VIP rewards</p>
              )}
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h3 font-bold">Referral History</h2>
            <div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-lg border border-outline-variant/30 text-body-sm cursor-pointer">
              <span>Filter: All Time</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {data.history.length === 0 ? (
            <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center mb-6 border border-outline-variant/20">
                <svg className="w-12 h-12 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h4 className="text-h3 font-bold mb-2">No referrals yet</h4>
              <p className="text-body-lg text-on-surface-variant max-w-[420px]">No referrals yet — bring the right people in to grow your network.</p>
              <button className="mt-8 px-8 py-4 border border-primary text-primary font-bold rounded-lg hover:bg-primary/5 transition-all flex items-center gap-3 active:scale-95">
                Invite Your First Member
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-high/50 border-b border-outline-variant/30">
                      <th className="px-6 py-4 text-label-caps text-on-surface-variant tracking-wider">Person</th>
                      <th className="px-6 py-4 text-label-caps text-on-surface-variant tracking-wider">Signed up</th>
                      <th className="px-6 py-4 text-label-caps text-on-surface-variant tracking-wider">First order</th>
                      <th className="px-6 py-4 text-label-caps text-on-surface-variant tracking-wider text-right">Contribution</th>
                      <th className="px-6 py-4 text-label-caps text-on-surface-variant tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {visibleHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-surface-elevated/50 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-bold border border-outline-variant/30">
                            {entry.initials}
                          </div>
                          <span className="text-body-sm font-medium">{entry.name}</span>
                        </td>
                        <td className="px-6 py-4 text-body-sm text-on-surface-variant">{entry.signed_up}</td>
                        <td className="px-6 py-4 text-body-sm text-on-surface-variant">{entry.first_order || "—"}</td>
                        <td className={`px-6 py-4 text-body-sm font-mono text-right ${entry.contribution > 0 ? "text-primary" : "text-on-surface-variant"}`}>
                          {entry.contribution} pts
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tight border ${STATUS_STYLES[entry.status]}`}>
                            {STATUS_LABELS[entry.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!showAll && remainingCount > 0 && (
                <div className="p-4 text-center bg-surface-container-lowest/30">
                  <button
                    onClick={() => setShowAll(true)}
                    className="text-body-sm font-medium text-primary hover:underline"
                  >
                    View {remainingCount} more referral{remainingCount !== 1 ? "s" : ""}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="pt-6 border-t border-outline-variant/20">
          <div className="bg-surface-elevated p-6 rounded-xl flex items-center justify-between border border-outline-variant/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center text-on-surface-variant">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-body-md">Stealth Mode</div>
                <div className="text-body-sm text-on-surface-variant">Hide your name from your referree&apos;s network contribution feed.</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={stealthMode}
                onChange={() => setStealthMode(!stealthMode)}
              />
              <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
        </footer>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="w-full" data-testid="referrals-page-wrapper">
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-xl border border-outline-variant/30 p-6 md:p-10">
          <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-primary/5 blur-[120px] rounded-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div>
              <span className="inline-block text-label-caps text-primary border border-primary/30 px-3 py-1 rounded-full mb-4">MEMBER PRIVILEGE</span>
              <h1 className="text-h2 md:text-h1 mb-4">Expand the Inner Circle</h1>
              <p className="text-body-lg text-on-surface-variant mb-6">
                Share the craft. For every collector who joins via your invitation, you both receive exclusive allocation access and a $25 credit toward your next archive bottle.
              </p>
              <div>
                <span className="text-label-caps text-on-surface-variant tracking-wider block mb-2">YOUR REFERRAL CODE</span>
                <p className="text-body-sm text-on-surface-variant mb-4">
                  You&apos;ll receive your unique invite link once your membership is approved.
                </p>
                <a
                  href="/apply"
                  className="inline-block bg-primary text-on-primary px-6 py-3 font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  Track application
                </a>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="aspect-square relative rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-elevated border border-outline-variant/20 p-6 rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="text-label-caps text-on-surface-variant">INVITED</span>
            </div>
            <div className="text-h2 font-bold">0</div>
            <div className="text-body-sm text-on-surface-variant">Successful Referrals</div>
          </div>
          <div className="bg-surface-elevated border border-outline-variant/20 p-6 rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-label-caps text-on-surface-variant">CREDIT</span>
            </div>
            <div className="text-h2 font-bold">$0.00</div>
            <div className="text-body-sm text-on-surface-variant">Total Earned</div>
          </div>
          <div className="bg-surface-elevated border border-outline-variant/20 p-6 rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-label-caps text-on-surface-variant">VAULT STATUS</span>
            </div>
            <div className="text-h2 font-bold text-on-surface-variant">LOCKED</div>
            <div className="text-body-sm text-on-surface-variant italic">3 more for VIP Vault</div>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant/20 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-high/10">
            <h3 className="text-h3 font-bold">Referral History</h3>
            <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="p-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center mb-6 border border-outline-variant/20">
              <svg className="w-12 h-12 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h4 className="text-h3 font-bold mb-2">No referrals yet</h4>
            <p className="text-body-lg text-on-surface-variant max-w-[420px]">No referrals yet — bring the right people in to grow your network.</p>
            <button className="mt-8 px-8 py-4 border border-primary text-primary font-bold rounded-lg hover:bg-primary/5 transition-all flex items-center gap-3 active:scale-95">
              Invite Your First Member
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-between border-t border-outline-variant/20 pt-8">
          <div className="flex-1">
            <h5 className="text-body-md font-bold mb-1">Program Guidelines</h5>
            <p className="text-body-sm text-on-surface-variant">Referrals must be first-time members. Rewards are credited after their first box shipment. Maximum 5 referrals per month for Elite Tier members.</p>
          </div>
          <div className="flex gap-4 items-center">
            <a className="text-label-caps text-primary hover:underline" href="#">Full Terms</a>
            <span className="w-1 h-1 bg-outline rounded-full" />
            <a className="text-label-caps text-primary hover:underline" href="#">Support</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShareButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  const icons: Record<string, JSX.Element> = {
    twitter: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    email: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    facebook: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M22 12.061C22 6.504 17.523 2 12 2S2 6.504 2 12.061C2 17.083 5.657 21.245 10.438 22v-7.03H7.898v-2.91h2.54V9.845c0-2.522 1.492-3.915 3.776-3.915 1.094 0 2.238.197 2.238.197v2.476h-1.26c-1.243 0-1.63.776-1.63 1.572v1.886h2.773l-.443 2.91h-2.33V22C18.343 21.245 22 17.083 22 12.061z" />
      </svg>
    ),
  }

  return (
    <button onClick={onClick} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors group">
      <div className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center group-hover:border-primary transition-colors">
        {icons[icon]}
      </div>
      <span className="text-body-sm font-medium">{label}</span>
    </button>
  )
}
