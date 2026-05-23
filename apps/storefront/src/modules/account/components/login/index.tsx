import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import Input from "@modules/common/components/input"
import Icon from "@modules/common/components/icon"
import { useActionState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)

  return (
    <div
      className="max-w-[400px] w-full bg-surface-container rounded-2xl border border-outline-variant p-8 shadow-lg"
      data-testid="login-page"
    >
      <div className="text-center mb-8">
        <h1 className="text-xl font-black tracking-tighter text-primary mb-1">HOPS &amp; GLORY</h1>
        <p className="text-label-caps uppercase tracking-[0.15em] text-on-surface-variant">
          The Collector&apos;s Portal
        </p>
      </div>

      <h2 className="text-h3 text-on-surface text-center mb-2">Welcome back</h2>
      <p className="text-center text-body-sm text-on-surface-variant mb-8">
        Sign in to access your private collection.
      </p>

      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-4">
          <Input
            name="email"
            type="email"
            label="Email address"
            required
            data-testid="email-input"
          />
          <Input
            name="password"
            type="password"
            label="Password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <button
          type="submit"
          className="w-full mt-6 bg-primary text-on-primary h-12 rounded-xl font-bold text-body-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          data-testid="sign-in-button"
        >
          Sign in
          <Icon name="arrow_forward" size={18} />
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-outline-variant text-center">
        <p className="text-body-sm text-on-surface-variant">
          Not a member yet?{" "}
          <a href="/apply" className="text-primary font-semibold hover:underline transition-colors">
            Apply for membership
          </a>
        </p>
      </div>
    </div>
  )
}

export default Login
