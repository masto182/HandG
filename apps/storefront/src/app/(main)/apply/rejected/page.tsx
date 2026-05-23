import { Metadata } from "next"
import Link from "next/link"
import Icon from "@modules/common/components/icon"

export const metadata: Metadata = {
  title: "Application Status | Hops & Glory",
}

export default function ApplyRejectedPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-16 px-6">
      <div className="max-w-md text-center flex flex-col items-center">
        <div className="bg-surface-container border border-outline-variant rounded-2xl p-10 w-full">
          <Icon name="sentiment_neutral" size={40} className="text-on-surface-variant mb-4 mx-auto" />
          <h1 className="text-h2 text-on-surface mb-3">Application not approved</h1>
          <p className="text-body-md text-on-surface-variant mb-8">
            Thank you for your interest in Hops &amp; Glory. Unfortunately, we&apos;re not able to approve your application at this time. This isn&apos;t necessarily permanent — we encourage you to apply again in the future.
          </p>

          <div className="flex flex-col gap-3 w-full">
            <Link
              href="/apply"
              className="w-full bg-primary text-on-primary h-12 rounded-xl font-bold text-body-md hover:opacity-90 transition-opacity flex items-center justify-center"
            >
              Try again
            </Link>
            <Link
              href="/"
              className="w-full border border-outline-variant text-on-surface h-12 rounded-xl font-medium text-body-md hover:bg-surface-container-high transition-colors flex items-center justify-center"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
