"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import { sdk } from "@lib/config"
import Input from "@modules/common/components/input"
import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

const ProfilePassword: React.FC<MyInformationProps> = ({ customer: _customer }) => {
  const [successState, setSuccessState] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const updatePassword = async (formData: FormData) => {
    setErrorMessage(null)
    const oldPwd = String(formData.get("old_password") || "")
    const newPwd = String(formData.get("new_password") || "")
    const confirmPwd = String(formData.get("confirm_password") || "")

    if (newPwd.length < 12) {
      setErrorMessage("New password must be at least 12 characters")
      return
    }
    if (newPwd !== confirmPwd) {
      setErrorMessage("New password and confirmation do not match")
      return
    }

    setSubmitting(true)
    try {
      await sdk.client.fetch("/store/customers/me/password", {
        method: "POST",
        body: { old_password: oldPwd, new_password: newPwd },
      })
      setSuccessState(true)
      toast.success("Password updated")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Password update failed"
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const clearState = () => {
    setSuccessState(false)
    setErrorMessage(null)
  }

  return (
    <form
      action={updatePassword}
      onReset={() => clearState()}
      className="w-full"
    >
      <AccountInfo
        label="Password"
        currentInfo={
          <span>The password is not shown for security reasons</span>
        }
        isSuccess={successState}
        isError={!!errorMessage}
        errorMessage={errorMessage || undefined}
        clearState={clearState}
        data-testid="account-password-editor"
      >
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Old password"
            name="old_password"
            required
            type="password"
            autoComplete="current-password"
            data-testid="old-password-input"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="New password"
              type="password"
              name="new_password"
              required
              minLength={12}
              autoComplete="new-password"
              data-testid="new-password-input"
            />
            <Input
              label="Confirm new password"
              type="password"
              name="confirm_password"
              required
              minLength={12}
              autoComplete="new-password"
              data-testid="confirm-password-input"
            />
          </div>
          <a
            href="/forgot-password"
            className="text-xs text-hg-text-secondary hover:text-hg-gold transition-colors"
          >
            Forgot your current password?
          </a>
        </div>
        <input type="hidden" name="_submitting" value={submitting ? "1" : "0"} />
      </AccountInfo>
    </form>
  )
}

export default ProfilePassword
