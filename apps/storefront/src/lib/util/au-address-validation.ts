export const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"] as const
export type AUState = (typeof AU_STATES)[number]

const STATE_POSTCODE_PREFIXES: Record<AUState, string[]> = {
  NSW: ["1", "2"],
  VIC: ["3", "8"],
  QLD: ["4", "9"],
  WA: ["6"],
  SA: ["5"],
  TAS: ["7"],
  NT: ["0"],
  ACT: ["0", "2"],
}

export function isValidAUState(state: string): state is AUState {
  return AU_STATES.includes(state.toUpperCase() as AUState)
}

export function isValidAUPostcode(postcode: string): boolean {
  return /^\d{4}$/.test(postcode)
}

export function doesPostcodeMatchState(
  postcode: string,
  state: string
): boolean {
  if (!isValidAUPostcode(postcode) || !isValidAUState(state)) return false
  const prefix = postcode[0]
  const validPrefixes = STATE_POSTCODE_PREFIXES[state.toUpperCase() as AUState]
  return validPrefixes.includes(prefix)
}

export function validateAUAddress(fields: {
  province?: string
  postal_code?: string
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (fields.province && !isValidAUState(fields.province)) {
    errors.push(`Invalid state: ${fields.province}. Must be one of: ${AU_STATES.join(", ")}`)
  }

  if (fields.postal_code && !isValidAUPostcode(fields.postal_code)) {
    errors.push("Postcode must be exactly 4 digits")
  }

  if (
    fields.province &&
    fields.postal_code &&
    isValidAUState(fields.province) &&
    isValidAUPostcode(fields.postal_code) &&
    !doesPostcodeMatchState(fields.postal_code, fields.province)
  ) {
    errors.push(`Postcode ${fields.postal_code} does not match state ${fields.province}`)
  }

  return { valid: errors.length === 0, errors }
}
