"use client"

import { requestPasswordReset } from "@lib/data/customer"
import ErrorMessage from "@modules/checkout/components/error-message"
import Input from "@modules/common/components/input"
import { useActionState } from "react"

const ForgotPasswordForm = () => {
  const [state, formAction] = useActionState(requestPasswordReset, null)

  if (state === "sent") {
    return (
      <div
        className="max-w-[400px] w-full bg-surface-container rounded-2xl border border-outline-variant p-8 shadow-lg"
        data-testid="forgot-password-confirmation"
      >
        <div className="text-center mb-6">
          <h1 className="text-xl font-black tracking-tighter text-primary mb-1">
            HOPS &amp; GLORY
          </h1>
          <p className="text-label-caps uppercase tracking-[0.15em] text-on-surface-variant">
            The Collector&apos;s Portal
          </p>
        </div>
        <h2 className="text-h3 text-on-surface text-center mb-2">
          Check your inbox
        </h2>
        <p className="text-center text-body-sm text-on-surface-variant mb-6">
          If that email belongs to an account, you&apos;ll receive a reset link
          shortly. The link expires in <strong>1 hour</strong>.
        </p>
        <a
          href="/account"
          className="block w-full text-center mt-4 text-body-sm text-primary font-semibold hover:underline transition-colors"
        >
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <div
      className="max-w-[400px] w-full bg-surface-container rounded-2xl border border-outline-variant p-8 shadow-lg"
      data-testid="forgot-password-page"
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
        Reset your password
      </h2>
      <p className="text-center text-body-sm text-on-surface-variant mb-8">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

      <form className="w-full" action={formAction}>
        <Input
          name="email"
          type="email"
          label="Email address"
          required
          data-testid="forgot-email-input"
        />
        <ErrorMessage
          error={state !== "sent" ? state : null}
          data-testid="forgot-error-message"
        />
        <button
          type="submit"
          className="w-full mt-6 bg-primary text-on-primary h-12 rounded-xl font-bold text-body-md hover:opacity-90 active:scale-[0.98] transition-all"
          data-testid="send-reset-button"
        >
          Send reset link
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-outline-variant text-center space-y-2">
        <p className="text-body-sm text-on-surface-variant">
          Not sure which email you used?{" "}
          <a
            href="mailto:hello@hopsandglory.au"
            className="text-primary font-semibold hover:underline transition-colors"
          >
            Contact us
          </a>
        </p>
        <p className="text-body-sm text-on-surface-variant">
          <a
            href="/account"
            className="text-primary font-semibold hover:underline transition-colors"
          >
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  )
}

export default ForgotPasswordForm
