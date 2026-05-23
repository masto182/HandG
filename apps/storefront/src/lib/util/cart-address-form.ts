import type { SetAddressesAddress, SetAddressesInput } from "@lib/data/cart"

export function setAddressesInputFromFormData(formData: FormData): SetAddressesInput {
  const get = (k: string) => (formData.get(k) ?? "") as string
  const shipping_address: SetAddressesAddress = {
    first_name: get("shipping_address.first_name"),
    last_name: get("shipping_address.last_name"),
    address_1: get("shipping_address.address_1"),
    address_2: "",
    company: get("shipping_address.company"),
    postal_code: get("shipping_address.postal_code"),
    city: get("shipping_address.city"),
    country_code: get("shipping_address.country_code"),
    province: get("shipping_address.province"),
    phone: get("shipping_address.phone"),
  }
  const same_as_billing = formData.get("same_as_billing") === "on"
  const billing_address: SetAddressesAddress | undefined = same_as_billing
    ? shipping_address
    : {
        first_name: get("billing_address.first_name"),
        last_name: get("billing_address.last_name"),
        address_1: get("billing_address.address_1"),
        address_2: "",
        company: get("billing_address.company"),
        postal_code: get("billing_address.postal_code"),
        city: get("billing_address.city"),
        country_code: get("billing_address.country_code"),
        province: get("billing_address.province"),
        phone: get("billing_address.phone"),
      }
  return {
    shipping_address,
    billing_address,
    email: get("email"),
    same_as_billing,
  }
}
