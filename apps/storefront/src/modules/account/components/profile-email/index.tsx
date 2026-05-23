"use client"

import React, { useEffect, useActionState } from "react";
import { toast } from "sonner"
import { sdk } from "@lib/config"

import Input from "@modules/common/components/input"

import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

const ProfileEmail: React.FC<MyInformationProps> = ({ customer }) => {
  const [successState, setSuccessState] = React.useState(false)

  const updateCustomerEmail = async (
    _currentState: { error: string | null; success: boolean },
    formData: FormData
  ) => {
    const newEmail = String(formData.get("email") || "").trim().toLowerCase()
    if (!newEmail || newEmail === customer.email) {
      return { success: false, error: "Enter a new email address" }
    }
    try {
      await sdk.client.fetch("/store/customers/me/email-change-request", {
        method: "POST",
        body: { new_email: newEmail },
      })
      toast.success(
        `A confirmation link has been sent to ${newEmail}. Click it within 24 hours to complete the change.`
      )
      return { success: true, error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start email change"
      toast.error(msg)
      return { success: false, error: msg }
    }
  }

  const [state, formAction] = useActionState(updateCustomerEmail, {
    error: null as string | null,
    success: false,
  })

  const clearState = () => {
    setSuccessState(false)
  }

  useEffect(() => {
    setSuccessState(state.success)
  }, [state])

  return (
    <form action={formAction} className="w-full">
      <AccountInfo
        label="Email"
        currentInfo={`${customer.email}`}
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={state.error || undefined}
        clearState={clearState}
        data-testid="account-email-editor"
      >
        <div className="grid grid-cols-1 gap-y-2">
          <Input
            label="New email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={customer.email}
            data-testid="email-input"
          />
          <p className="text-xs text-hg-text-secondary">
            We will send a confirmation link to the new address. The change
            takes effect once you click that link.
          </p>
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileEmail
