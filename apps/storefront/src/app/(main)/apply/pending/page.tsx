import { Metadata } from "next"
import Link from "next/link"
import Icon from "@modules/common/components/icon"

export const metadata: Metadata = {
  title: "Application Under Review | Hops & Glory",
}

export default function ApplyPendingPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-16 px-6">
      <div className="max-w-md text-center flex flex-col items-center">
        <div className="bg-primary-container/20 border border-primary/20 rounded-2xl p-10 w-full">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 opacity-50">
              <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">✓</span>
              <span className="text-label-caps text-primary">Applied</span>
            </div>
            <div className="h-px w-6 bg-primary/30" />
            <div className="flex items-center gap-2 bg-primary-container/30 px-4 py-1.5 rounded-full border border-primary/40">
              <span className="w-5 h-5 rounded-full bg-primary animate-pulse" />
              <span className="text-label-caps text-primary">Review</span>
            </div>
            <div className="h-px w-6 bg-outline-variant/30" />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-outline-variant/30 opacity-50">
              <span className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold flex items-center justify-center">3</span>
              <span className="text-label-caps text-on-surface-variant">Welcome</span>
            </div>
          </div>

          <Icon name="hourglass_top" size={40} className="text-primary mb-4 mx-auto" />
          <h1 className="text-h2 text-on-surface mb-3">Application under review</h1>
          <p className="text-body-md text-on-surface-variant mb-8">
            We&apos;re reviewing your membership application. You&apos;ll hear from us by email when there&apos;s an update.
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-outline-variant text-on-surface font-medium rounded-xl hover:bg-surface-container-high transition-colors"
          >
            <Icon name="arrow_back" size={16} />
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
