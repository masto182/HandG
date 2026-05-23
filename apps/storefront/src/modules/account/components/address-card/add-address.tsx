"use client"

import { Plus } from "@medusajs/icons"
import { Button } from "@modules/common/components/ui"
import { useActionState, useEffect, useState, useCallback } from "react"

import { addCustomerAddress } from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import { HttpTypes } from "@medusajs/types"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import AddressAutocomplete from "@modules/common/components/address-autocomplete"

const AddAddress = ({
  region,
  addresses,
}: {
  region: HttpTypes.StoreRegion
  addresses: HttpTypes.StoreCustomerAddress[]
}) => {
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)
  const [autoCity, setAutoCity] = useState("")
  const [autoProvince, setAutoProvince] = useState("")
  const [autoPostal, setAutoPostal] = useState("")
  const [autoAddress2, setAutoAddress2] = useState("")

  const [formState, formAction] = useActionState(addCustomerAddress, {
    success: false,
    error: null,
  } as { success: boolean; error: string | null })

  const close = () => {
    setSuccessState(false)
    setAutoCity("")
    setAutoProvince("")
    setAutoPostal("")
    setAutoAddress2("")
    closeModal()
  }

  const handleAddressSelect = useCallback((parts: { address_1: string; city: string; province: string; postal_code: string; country_code: string }) => {
    setAutoCity(parts.city)
    setAutoProvince(parts.province)
    setAutoPostal(parts.postal_code)
  }, [])

  useEffect(() => {
    if (successState) {
      close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successState])

  useEffect(() => {
    if (formState.success) {
      setSuccessState(true)
    }
  }, [formState])

  return (
    <>
      <button
        className="group flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 border-dashed border-outline-variant hover:border-primary/50 hover:bg-surface-container transition-all min-h-[220px] h-full w-full"
        onClick={open}
        data-testid="add-address-button"
      >
        <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center group-hover:scale-110 transition-transform">
          <Plus className="text-primary" />
        </div>
        <span className="text-label-caps uppercase tracking-[0.05em] text-on-surface-variant group-hover:text-primary">Add New Address</span>
      </button>

      <Modal isOpen={state} onClose={close} title="Add address" data-testid="add-address-modal">
        <form action={formAction}>
          <div className="flex flex-col gap-y-2">
            <div className="grid grid-cols-2 gap-x-2">
              <Input
                label="First name"
                name="first_name"
                required
                autoComplete="given-name"
                data-testid="first-name-input"
              />
              <Input
                label="Last name"
                name="last_name"
                required
                autoComplete="family-name"
                data-testid="last-name-input"
              />
            </div>
            <Input
              label="Company"
              name="company"
              autoComplete="organization"
              data-testid="company-input"
            />
            <AddressAutocomplete
              name="address_1"
              label="Address"
              required
              onPlaceSelect={handleAddressSelect}
            />
            <Input
              label="Apartment, suite, etc."
              name="address_2"
              defaultValue={autoAddress2}
              autoComplete="address-line2"
              data-testid="address-2-input"
            />
            <div className="grid grid-cols-[144px_1fr] gap-x-2">
              <Input
                label="Postal code"
                name="postal_code"
                required
                defaultValue={autoPostal}
                key={`postal-${autoPostal}`}
                autoComplete="postal-code"
                data-testid="postal-code-input"
              />
              <Input
                label="City"
                name="city"
                required
                defaultValue={autoCity}
                key={`city-${autoCity}`}
                autoComplete="locality"
                data-testid="city-input"
              />
            </div>
            <Input
              label="Province / State"
              name="province"
              defaultValue={autoProvince}
              key={`province-${autoProvince}`}
              autoComplete="address-level1"
              data-testid="state-input"
            />
            <input type="hidden" name="country_code" value="au" />
            <div className="flex items-center h-10 px-4 bg-hg-surface border border-hg-border rounded-md text-hg-text text-sm">
              Australia
            </div>
            <Input
              label="Phone"
              name="phone"
              autoComplete="phone"
              data-testid="phone-input"
            />
          </div>
          {formState.error && (
            <div
              className="text-rose-500 text-small-regular py-2"
              data-testid="address-error"
            >
              {formState.error}
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <Button
              type="reset"
              variant="secondary"
              onClick={close}
              className="h-10"
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <SubmitButton data-testid="save-button">Save</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default AddAddress
