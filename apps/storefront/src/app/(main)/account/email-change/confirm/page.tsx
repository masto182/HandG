import type { Metadata } from "next"
import EmailChangeConfirm from "@modules/account/components/email-change-confirm"

export const metadata: Metadata = {
  title: "Confirm email change",
}

type Props = {
  searchParams: Promise<{ token?: string }>
}

export default async function EmailChangeConfirmPage({ searchParams }: Props) {
  const { token } = await searchParams
  return (
    <div className="max-w-xl mx-auto py-16 px-6">
      <h1 className="text-h1 text-hg-text mb-6">Confirm email change</h1>
      <EmailChangeConfirm token={token ?? ""} />
    </div>
  )
}
