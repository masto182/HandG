import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "Account | Hops & Glory",
  description: "Sign in to your Hops & Glory account.",
}

export default function Login() {
  return <LoginTemplate />
}
