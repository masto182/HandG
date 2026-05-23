"use client"
import { setAddresses } from "@lib/data/cart"
import { setAddressesInputFromFormData } from "@lib/util/cart-address-form"
import { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import CountrySelect from "@modules/checkout/components/country-select"
import Checkbox from "@modules/common/components/checkbox"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import ErrorMessage from "@modules/checkout/components/error-message"
import AddressAutocomplete from "@modules/common/components/address-autocomplete"
import { useActionState, useEffect, useMemo, useState } from "react"

type Props = {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
}

const StepAddress: React.FC<Props> = ({ cart, customer }) => {
  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2) ?? [],
    [cart?.region]
  )

  const savedAddresses = useMemo(
    () => customer?.addresses?.filter((a) => a.country_code && countriesInRegion.includes(a.country_code)) || [],
    [customer?.addresses, countriesInRegion]
  )

  const [selectedOption, setSelectedOption] = useState<"new" | string>(
    savedAddresses.length > 0 ? savedAddresses[0]?.id || "new" : "new"
  )
  const [showForm, setShowForm] = useState(savedAddresses.length === 0)
  const [saveAddress, setSaveAddress] = useState(false)

  const [formData, setFormData] = useState<Record<string, string>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || customer?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || customer?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code": cart?.shipping_address?.country_code || "au",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    email: cart?.email || customer?.email || "",
  })

  useEffect(() => {
    if (selectedOption !== "new" && savedAddresses.length > 0) {
      const addr = savedAddresses.find((a) => a.id === selectedOption)
      if (addr) {
        setFormData((prev) => ({
          ...prev,
          "shipping_address.first_name": addr.first_name || customer?.first_name || "",
          "shipping_address.last_name": addr.last_name || customer?.last_name || "",
          "shipping_address.address_1": addr.address_1 || "",
          "shipping_address.company": addr.company || "",
          "shipping_address.postal_code": addr.postal_code || "",
          "shipping_address.city": addr.city || "",
          "shipping_address.country_code": addr.country_code || "au",
          "shipping_address.province": addr.province || "",
          "shipping_address.phone": addr.phone || "",
        }))
      }
      setShowForm(false)
    } else {
      setShowForm(true)
    }
  }, [selectedOption, savedAddresses, customer])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const [message, formAction] = useActionState(
    async (state: string | null | undefined, fd: FormData) => {
      return setAddresses(state, setAddressesInputFromFormData(fd))
    },
    null
  )

  const iconForAddress = (addr: any) => {
    const label = ((addr.metadata as any)?.label || "").toLowerCase()
    if (label.includes("home")) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
    if (label.includes("office") || label.includes("work")) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-h1 text-hg-text mb-4">
          Where should we send your craft?
        </h1>
        <p className="text-lg leading-relaxed text-hg-text-secondary">
          Enter your delivery details below. Our temperature-controlled couriers ensure your selection arrives in peak condition.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-y-8">
        {savedAddresses.length > 0 && (
          <div>
            <h2 className="font-semibold text-[12px] text-hg-text-secondary uppercase tracking-widest mb-4">Saved Addresses</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {savedAddresses.map((addr) => {
                const isActive = selectedOption === addr.id
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setSelectedOption(addr.id)}
                    className={`bg-hg-surface border-2 rounded-xl p-4 cursor-pointer text-left transition-all relative group ${isActive ? "border-hg-gold" : "border-hg-border/30 hover:border-hg-gold/50"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`${isActive ? "text-hg-gold" : "text-hg-text-secondary group-hover:text-hg-gold"} transition-colors`}>
                        {iconForAddress(addr)}
                      </span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isActive ? "border-hg-gold bg-hg-gold" : "border-hg-border"}`}>
                        {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-hg-on-primary"><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-hg-text">{(addr.metadata as any)?.label || "Address"}</p>
                    <p className="text-xs text-hg-text-secondary leading-tight mt-1">
                      {[addr.address_1, addr.city, addr.province, addr.postal_code].filter(Boolean).join(", ")}
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="h-px bg-hg-border flex-grow" />
              <button
                type="button"
                onClick={() => { setSelectedOption("new"); setShowForm(true) }}
                className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest hover:text-hg-gold transition-colors"
              >
                Or enter manually
              </button>
              <div className="h-px bg-hg-border flex-grow" />
            </div>
          </div>
        )}

        {selectedOption !== "new" && (
          <>
            <input type="hidden" name="shipping_address.first_name" value={formData["shipping_address.first_name"]} />
            <input type="hidden" name="shipping_address.last_name" value={formData["shipping_address.last_name"]} />
            <input type="hidden" name="shipping_address.address_1" value={formData["shipping_address.address_1"]} />
            <input type="hidden" name="shipping_address.company" value={formData["shipping_address.company"]} />
            <input type="hidden" name="shipping_address.postal_code" value={formData["shipping_address.postal_code"]} />
            <input type="hidden" name="shipping_address.city" value={formData["shipping_address.city"]} />
            <input type="hidden" name="shipping_address.country_code" value={formData["shipping_address.country_code"]} />
            <input type="hidden" name="shipping_address.province" value={formData["shipping_address.province"]} />
            <input type="hidden" name="shipping_address.phone" value={formData["shipping_address.phone"]} />
            <input type="hidden" name="email" value={formData.email} />
            <input type="hidden" name="same_as_billing" value="on" />
          </>
        )}

        {showForm && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-hg-text">Add New Address</h2>
            <div className="space-y-2">
              <label className="font-semibold text-[12px] text-hg-text-secondary uppercase tracking-widest">Full Name</label>
              <div className="grid grid-cols-2 gap-4">
                <input name="shipping_address.first_name" autoComplete="given-name" value={formData["shipping_address.first_name"]} onChange={handleChange} required placeholder="First name" className="w-full bg-hg-surface border-0 ring-1 ring-hg-border focus:ring-2 focus:ring-hg-gold rounded-xl px-4 py-4 text-hg-text placeholder:text-hg-text-muted transition-all outline-none" />
                <input name="shipping_address.last_name" autoComplete="family-name" value={formData["shipping_address.last_name"]} onChange={handleChange} required placeholder="Last name" className="w-full bg-hg-surface border-0 ring-1 ring-hg-border focus:ring-2 focus:ring-hg-gold rounded-xl px-4 py-4 text-hg-text placeholder:text-hg-text-muted transition-all outline-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-semibold text-[12px] text-hg-text-secondary uppercase tracking-widest">Street Address</label>
              <AddressAutocomplete
                name="shipping_address.address_1"
                label=""
                required
                defaultValue={formData["shipping_address.address_1"]}
                onPlaceSelect={(addr) => {
                  setFormData((prev) => ({
                    ...prev,
                    "shipping_address.address_1": addr.address_1,
                    "shipping_address.city": addr.city,
                    "shipping_address.province": addr.province,
                    "shipping_address.postal_code": addr.postal_code,
                    "shipping_address.country_code": addr.country_code,
                  }))
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="font-semibold text-[12px] text-hg-text-secondary uppercase tracking-widest">Apartment, Suite, Unit (Optional)</label>
              <input name="shipping_address.company" value={formData["shipping_address.company"]} onChange={handleChange} placeholder="Suite 4B" className="w-full bg-hg-surface border-0 ring-1 ring-hg-border focus:ring-2 focus:ring-hg-gold rounded-xl px-4 py-4 text-hg-text placeholder:text-hg-text-muted transition-all outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="font-semibold text-[12px] text-hg-text-secondary uppercase tracking-widest">City</label>
                <input name="shipping_address.city" autoComplete="address-level2" value={formData["shipping_address.city"]} onChange={handleChange} required placeholder="Sydney" className="w-full bg-hg-surface border-0 ring-1 ring-hg-border focus:ring-2 focus:ring-hg-gold rounded-xl px-4 py-4 text-hg-text placeholder:text-hg-text-muted transition-all outline-none" />
              </div>
              <div className="space-y-2">
                <label className="font-semibold text-[12px] text-hg-text-secondary uppercase tracking-widest">State / County</label>
                <input name="shipping_address.province" autoComplete="address-level1" value={formData["shipping_address.province"]} onChange={handleChange} placeholder="NSW" className="w-full bg-hg-surface border-0 ring-1 ring-hg-border focus:ring-2 focus:ring-hg-gold rounded-xl px-4 py-4 text-hg-text placeholder:text-hg-text-muted transition-all outline-none" />
              </div>
              <div className="space-y-2">
                <label className="font-semibold text-[12px] text-hg-text-secondary uppercase tracking-widest">Postcode</label>
                <input name="shipping_address.postal_code" autoComplete="postal-code" value={formData["shipping_address.postal_code"]} onChange={handleChange} required placeholder="2000" className="w-full bg-hg-surface border-0 ring-1 ring-hg-border focus:ring-2 focus:ring-hg-gold rounded-xl px-4 py-4 text-hg-text placeholder:text-hg-text-muted transition-all outline-none" />
              </div>
            </div>
            <input type="hidden" name="shipping_address.country_code" value={formData["shipping_address.country_code"]} />
            <input name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} required placeholder="Email address" className="w-full bg-hg-surface border-0 ring-1 ring-hg-border focus:ring-2 focus:ring-hg-gold rounded-xl px-4 py-4 text-hg-text placeholder:text-hg-text-muted transition-all outline-none" />
            <input type="hidden" name="same_as_billing" value="on" />
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={saveAddress} onChange={() => setSaveAddress(!saveAddress)} className="appearance-none w-5 h-5 rounded bg-hg-surface border border-hg-border checked:bg-hg-gold checked:border-hg-gold relative after:content-[''] after:absolute after:inset-0 after:flex after:items-center after:justify-center checked:after:content-['✓'] after:text-[11px] after:text-hg-on-primary after:font-bold after:leading-5 after:text-center cursor-pointer" />
              <span className="text-sm text-hg-text-secondary">Save this address to my profile for future orders</span>
            </div>
          </div>
        )}

        <ErrorMessage error={message} />

        <div className="flex items-center justify-between pt-6 border-t border-hg-border/30">
          <a href="/checkout?step=fulfilment" className="flex items-center gap-2 text-sm text-hg-text-secondary hover:text-hg-text transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            Return to Fulfilment
          </a>
          <SubmitButton className="px-8 py-3.5 bg-hg-gold text-hg-bg font-bold text-sm rounded-full transition-all hover:brightness-110 active:scale-95">
            Continue to Shipping Method →
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}

export default StepAddress
