"use client"
import { useEffect, useRef } from "react"

type ParsedAddress = {
  address_1: string
  city: string
  province: string
  postal_code: string
  country_code: string
}

type Props = {
  onAddressSelected: (addr: ParsedAddress) => void
  defaultValue?: string
  placeholder?: string
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

function extractAddressComponents(place: google.maps.places.PlaceResult): ParsedAddress {
  const components = place.address_components || []
  let streetNumber = ""
  let route = ""
  let city = ""
  let state = ""
  let postcode = ""

  for (const c of components) {
    const types = c.types
    if (types.includes("street_number")) streetNumber = c.long_name
    else if (types.includes("route")) route = c.short_name
    else if (types.includes("locality")) city = c.long_name
    else if (types.includes("administrative_area_level_1")) state = c.short_name
    else if (types.includes("postal_code")) postcode = c.long_name
  }

  return {
    address_1: streetNumber ? `${streetNumber} ${route}` : route,
    city,
    province: state,
    postal_code: postcode,
    country_code: "au",
  }
}

export default function AddressAutocomplete({
  onAddressSelected,
  defaultValue = "",
  placeholder = "Start typing your address...",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const callbackRef = useRef(onAddressSelected)
  callbackRef.current = onAddressSelected

  useEffect(() => {
    if (!API_KEY || !inputRef.current) return

    let cancelled = false

    function init() {
      if (cancelled || !inputRef.current) return
      if (autocompleteRef.current) return
      if (!window.google?.maps?.places) return

      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "au" },
        types: ["address"],
        fields: ["address_components", "formatted_address"],
      })

      ac.addListener("place_changed", () => {
        const place = ac.getPlace()
        if (!place.address_components) return
        const parsed = extractAddressComponents(place)
        if (inputRef.current) {
          inputRef.current.value = place.formatted_address || parsed.address_1
        }
        callbackRef.current(parsed)
      })

      autocompleteRef.current = ac
    }

    if (window.google?.maps?.places) {
      init()
      return
    }

    const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`)
    if (!existingScript) {
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`
      script.async = true
      script.onload = () => init()
      document.head.appendChild(script)
    }

    const interval = setInterval(() => {
      if (window.google?.maps?.places) {
        clearInterval(interval)
        init()
      }
    }, 200)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (!API_KEY) {
    return (
      <input
        type="text"
        name="shipping_address.address_1"
        autoComplete="street-address"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-hg-surface border-0 ring-1 ring-hg-border focus:ring-2 focus:ring-hg-gold rounded-xl px-4 py-4 text-hg-text placeholder:text-hg-text-muted transition-all outline-none"
      />
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        name="shipping_address.address_1"
        autoComplete="off"
        data-lpignore="true"
        data-form-type="other"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-hg-surface border-0 ring-1 ring-hg-border focus:ring-2 focus:ring-hg-gold rounded-xl px-4 py-4 text-hg-text placeholder:text-hg-text-muted transition-all outline-none"
      />
      <span className="absolute right-3 bottom-1 text-[9px] text-hg-text-muted opacity-60">
        Powered by Google
      </span>
    </div>
  )
}
