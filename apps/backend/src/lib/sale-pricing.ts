/**
 * Sale pricing rule — single source of truth.
 *
 * The working spreadsheet ("Beers from the US") holds a base price `Was` and a
 * discount `Sale`, and the sale price is `Was x (1 - Sale)`. The `Price` column is
 * a DERIVED value, and when it is copied out of the sheet it is frequently a
 * rounded display value. A rounded price cannot be un-rounded downstream: the
 * 2026-08-26 production load trusted a pasted `Price` and wrote 48 sale prices as
 * whole dollars, permanently losing the cents.
 *
 * So the rule is: **when a usable `Sale` percentage is present, the sale price is
 * recomputed from `Was` and the pasted `Price` is ignored.** Without a usable
 * percentage the pasted `Price` is used unchanged.
 *
 * This module is intentionally pure and dependency-free so both the CSV
 * generator (`scripts/prep-beers.ts`) and the importer that actually writes
 * prices (`src/scripts/import-us-beers.ts`) can share one implementation, and so
 * the rule is unit-tested in exactly one place.
 */

export interface SalePricingInput {
  /** The spreadsheet's `Price` column (derived, possibly rounded). */
  price?: string | number | null
  /** The spreadsheet's `Sale` column — a percentage, with or without `%`. */
  sale?: string | number | null
  /** The spreadsheet's `Was` column — the base/strikethrough price. */
  was?: string | number | null
}

export interface SalePricingResult {
  /** The effective sale price to use, or null when no usable price was given. */
  price: number | null
  /** The base price. Falls back to `price` when `Was` is absent. */
  was: number | null
  /** The discount percentage when usable, else null. */
  salePct: number | null
  /** True when `price` was recomputed from `was` rather than taken as given. */
  recomputed: boolean
  /**
   * A human-readable note when the given `Price` disagreed with the computed
   * value, or when a percentage was supplied without a usable `Was`. Null when
   * the input needed no comment.
   */
  correction: string | null
}

/** Parses a money/percentage cell, tolerating `$`, `%`, commas and whitespace. */
export function parseMoney(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
  const cleaned = raw.replace(/[$,%\s]/g, "")
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Formats an amount to at most 2dp, trimming trailing zeros (42.50 -> "42.5"). */
export function formatMoney(n: number): string {
  return String(Number(n.toFixed(2)))
}

/** Rounds to 2 decimal places, the precision prices are stored at. */
export function roundMoney(n: number): number {
  return Number(n.toFixed(2))
}

/**
 * Resolves the sale price for one spreadsheet row.
 *
 * A percentage is only usable when it is strictly between 0 and 100 — 0 means
 * "no discount" and 100 would mean a free product, both of which indicate the
 * column was not meant as a discount for this row.
 */
export function resolveSalePricing(input: SalePricingInput): SalePricingResult {
  const pastedPrice = parseMoney(input.price)
  const salePct = parseMoney(input.sale)
  const was = parseMoney(input.was)

  const hasSale = salePct !== null && salePct > 0 && salePct < 100
  const hasWas = was !== null && was > 0

  if (hasSale && hasWas) {
    const computed = roundMoney(was! * (1 - salePct! / 100))
    const differs = pastedPrice === null || roundMoney(pastedPrice) !== computed
    return {
      price: computed,
      was: was!,
      salePct: salePct!,
      recomputed: true,
      correction: differs
        ? `Price ${pastedPrice === null ? "(empty)" : formatMoney(pastedPrice)} -> ` +
          `${formatMoney(computed)} (${formatMoney(salePct!)}% off ${formatMoney(was!)})`
        : null,
    }
  }

  if (hasSale && !hasWas) {
    return {
      price: pastedPrice,
      was: pastedPrice,
      salePct: salePct!,
      recomputed: false,
      correction:
        `Sale ${formatMoney(salePct!)}% given but "Was" is missing or unusable ` +
        `— kept Price ${pastedPrice === null ? "(empty)" : formatMoney(pastedPrice)}`,
    }
  }

  return {
    price: pastedPrice,
    was: hasWas ? was! : pastedPrice,
    salePct: null,
    recomputed: false,
    correction: null,
  }
}
