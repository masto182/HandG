"use client"

import { useEffect, useRef } from "react"

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

type AddressAutocompleteProps = {
  name: string
  label: string
  topLabel?: string
  defaultValue?: string
  onPlaceSelect?: (place: {
    address_1: string
    city: string
    province: string
    postal_code: string
    country_code: string
  }) => void
  required?: boolean
  className?: string
}

export default function AddressAutocomplete({
  name,
  label,
  topLabel,
  defaultValue,
  onPlaceSelect,
  required,
  className,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const callbackRef = useRef(onPlaceSelect)
  callbackRef.current = onPlaceSelect

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return

    let cancelled = false

    function init() {
      if (cancelled) return
      if (autocompleteRef.current) return
      if (!inputRef.current) return
      if (!window.google?.maps?.places) return

      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["address"],
        componentRestrictions: { country: "au" },
        fields: ["address_components", "formatted_address"],
      })

      ac.addListener("place_changed", () => {
        const place = ac.getPlace()
        if (!place.address_components) return

        const get = (type: string) =>
          place.address_components?.find((c) => c.types.includes(type))?.long_name || ""
        const getShort = (type: string) =>
          place.address_components?.find((c) => c.types.includes(type))?.short_name || ""

        const streetNumber = get("street_number")
        const route = get("route")

        if (inputRef.current) {
          inputRef.current.value = place.formatted_address || `${streetNumber} ${route}`.trim()
        }

        callbackRef.current?.({
          address_1: `${streetNumber} ${route}`.trim(),
          city: get("locality") || get("sublocality_level_1"),
          province: getShort("administrative_area_level_1"),
          postal_code: get("postal_code"),
          country_code: getShort("country").toLowerCase() || "au",
        })
      })

      autocompleteRef.current = ac
    }

    function loadAndInit() {
      if (window.google?.maps?.places) {
        init()
        return
      }

      if (!document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`)) {
        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`
        script.async = true
        document.head.appendChild(script)
      }

      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(interval)
          init()
        }
      }, 150)

      return () => clearInterval(interval)
    }

    const cleanup = loadAndInit()
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return (
    <div className={className}>
      {topLabel && (
        <label className="text-label-caps uppercase tracking-[0.05em] text-on-surface-variant mb-1.5 block">
          {topLabel}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        name={name}
        id={name}
        placeholder={label || "Start typing your address..."}
        defaultValue={defaultValue}
        required={required}
        autoComplete="off"
        data-lpignore="true"
        data-form-type="other"
        className="w-full bg-hg-surface border-0 ring-1 ring-hg-border focus:ring-2 focus:ring-hg-gold rounded-xl px-4 py-4 text-hg-text placeholder:text-hg-text-muted transition-all outline-none"
      />
    </div>
  )
}
