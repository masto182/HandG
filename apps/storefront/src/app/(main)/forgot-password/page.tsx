import ForgotPasswordForm from "@modules/account/components/forgot-password-form"

export const metadata = {
  title: "Reset Password | Hops & Glory",
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-12">
      <ForgotPasswordForm />
    </div>
  )
}
