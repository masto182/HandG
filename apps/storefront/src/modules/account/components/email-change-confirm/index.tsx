"use client"

import React, { useEffect, useState } from "react"
import { sdk } from "@lib/config"
import { toast } from "sonner"

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; email: string }
  | { kind: "error"; message: string }

export default function EmailChangeConfirm({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "idle" })

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "Missing token" })
      return
    }
    setState({ kind: "loading" })
    sdk.client
      .fetch<{ ok: boolean; email?: string; reason?: string; warning?: string }>(
        "/store/email-change/confirm",
        { method: "POST", body: { token } }
      )
      .then((res) => {
        if (res.ok && res.email) {
          setState({ kind: "success", email: res.email })
          toast.success("Email updated")
        } else {
          const reason = res.reason || "unknown"
          setState({
            kind: "error",
            message:
              reason === "expired"
                ? "This confirmation link has expired. Please request a new email change."
                : reason === "already_used"
                  ? "This link has already been used."
                  : reason === "not_found"
                    ? "Invalid confirmation token."
                    : "Failed to confirm email change.",
          })
          toast.error("Email change failed")
        }
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Failed to confirm"
        setState({ kind: "error", message: msg })
        toast.error("Email change failed")
      })
  }, [token])

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <p className="text-hg-text-secondary">Confirming your new email...</p>
    )
  }
  if (state.kind === "success") {
    return (
      <div className="space-y-4">
        <p className="text-hg-text">
          Your email has been changed to <strong>{state.email}</strong>.
        </p>
        <p className="text-hg-text-secondary">
          You can now sign in with the new address.
        </p>
        <a
          href="/account"
          className="inline-block px-6 py-3 bg-hg-gold text-hg-bg font-bold rounded-full"
        >
          Back to account
        </a>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <p className="text-rose-400">{state.message}</p>
      <a
        href="/account/profile"
        className="inline-block px-6 py-3 bg-hg-gold text-hg-bg font-bold rounded-full"
      >
        Back to profile
      </a>
    </div>
  )
}
