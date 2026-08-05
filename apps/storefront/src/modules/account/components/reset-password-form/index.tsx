"use client"

import { resetPassword } from "@lib/data/customer"
import ErrorMessage from "@modules/checkout/components/error-message"
import Input from "@modules/common/components/input"
import { useActionState } from "react"

type Props = {
  token: string
  email: string
}

const ResetPasswordForm = ({ token, email }: Props) => {
  const [state, formAction] = useActionState(resetPassword, null)

  return (
    <div
      className="max-w-[400px] w-full bg-surface-container rounded-2xl border border-outline-variant p-8 shadow-lg"
      data-testid="reset-password-page"
    >
      <div className="text-center mb-8">
        <h1 className="text-xl font-black tracking-tighter text-primary mb-1">
          HOPS &amp; GLORY
        </h1>
        <p className="text-label-caps uppercase tracking-[0.15em] text-on-surface-variant">
          The Collector&apos;s Portal
        </p>
      </div>

      <h2 className="text-h3 text-on-surface text-center mb-2">
        Choose a new password
      </h2>
      <p className="text-center text-body-sm text-on-surface-variant mb-8">
        Must be at least 12 characters.
      </p>

      <form className="w-full" action={formAction}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={token} />
        <div className="flex flex-col w-full gap-y-4">
          <Input
            name="password"
            type="password"
            label="New password"
            required
            minLength={12}
            data-testid="new-password-input"
          />
          <Input
            name="confirm_password"
            type="password"
            label="Confirm new password"
            required
            data-testid="confirm-password-input"
          />
        </div>
        <ErrorMessage error={state} data-testid="reset-error-message" />
        <button
          type="submit"
          className="w-full mt-6 bg-primary text-on-primary h-12 rounded-xl font-bold text-body-md hover:opacity-90 active:scale-[0.98] transition-all"
          data-testid="set-password-button"
        >
          Set new password
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-outline-variant text-center">
        <p className="text-body-sm text-on-surface-variant">
          Link not working?{" "}
          <a
            href="/forgot-password"
            className="text-primary font-semibold hover:underline transition-colors"
          >
            Request a new one
          </a>
        </p>
      </div>
    </div>
  )
}

export default ResetPasswordForm
