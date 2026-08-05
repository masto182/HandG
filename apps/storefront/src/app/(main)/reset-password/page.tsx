import ResetPasswordForm from "@modules/account/components/reset-password-form"

export const metadata = {
  title: "Set New Password | Hops & Glory",
}

type Props = {
  searchParams: Promise<{ token?: string; email?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams
  const token = params.token || ""
  const email = params.email || ""

  if (!token || !email) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-12">
        <div className="max-w-[400px] w-full bg-surface-container rounded-2xl border border-outline-variant p-8 shadow-lg text-center">
          <h1 className="text-xl font-black tracking-tighter text-primary mb-6">
            HOPS &amp; GLORY
          </h1>
          <h2 className="text-h3 text-on-surface mb-2">Invalid reset link</h2>
          <p className="text-body-sm text-on-surface-variant mb-6">
            This link is missing required information. Please request a new one.
          </p>
          <a
            href="/forgot-password"
            className="text-primary font-semibold hover:underline transition-colors text-body-sm"
          >
            Request a new reset link
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-12">
      <ResetPasswordForm token={token} email={email} />
    </div>
  )
}
