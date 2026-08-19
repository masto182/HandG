import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const SYNONYMS: Record<string, string> = {
  "india pale ale": "ipa",
  "indian pale ale": "ipa",
  "ne ipa": "neipa",
  "new england ipa": "neipa",
  "hazy ipa": "neipa",
  hazy: "neipa",
  wcipa: "west-coast-ipa",
  "wc ipa": "west-coast-ipa",
  "west coast": "west-coast-ipa",
  dipa: "double-ipa",
  "imperial ipa": "double-ipa",
  iipa: "double-ipa",
  tipa: "triple-ipa",
  apa: "american-pale-ale",
  "american pale": "american-pale-ale",
  "extra pale ale": "xpa",
  weizen: "hefeweizen",
  white: "witbier",
  wheat: "hefeweizen",
  lambic: "wild-ale",
  pils: "pilsner",
  marzen: "lager",
  "vienna lager": "lager",
  kolsch: "lager",
  amber: "red-ale",
  "robust porter": "porter",
  "brown porter": "porter",
  "baltic porter": "porter",
  "session ipa": "session-ipa",
  "fruit beer": "fruit-sour",
}

const normalize = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ")
const slugify = (s: string): string =>
  normalize(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

// Troon, Lolev, and Rar don't disclose a real style — they use generic
// hop-forward marketing labels instead. The same label spans multiple real
// style tiers depending on ABV, so these resolve by threshold, not a fixed
// synonym: Triple IPA >=10%, Double IPA 8-9.9%, IPA <8%.
const GENERIC_HOP_LABELS = new Set([
  "hoppy ale",
  "ultra hopped ale",
  "hop saturated ale",
  "imperial mild ale",
])

function resolveGenericHopStyle(abv: number, bySlug: Map<string, any>): any | null {
  const slug = abv >= 10 ? "triple-ipa" : abv >= 8 ? "double-ipa" : "ipa"
  return bySlug.get(slug) ?? null
}

export default async function backfillBeerStyleLinks({ container }: ExecArgs) {
  const logger = container.resolve("logger") as any
  const productModule = container.resolve(Modules.PRODUCT)
  const beerStyleService = container.resolve("beerStyle") as any
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const dryRun = process.argv.includes("--dry-run")
  if (dryRun) logger.info(`[Backfill] DRY RUN — no links will be written`)

  const styles = await beerStyleService.listBeerStyles()
  const byName = new Map<string, any>()
  const bySlug = new Map<string, any>()
  for (const s of styles) {
    byName.set(normalize(s.name), s)
    bySlug.set(s.slug, s)
  }

  const resolveStyle = (raw: string, abv: number): any | null => {
    const norm = normalize(raw)
    if (GENERIC_HOP_LABELS.has(norm)) return resolveGenericHopStyle(abv, bySlug)
    if (byName.has(norm)) return byName.get(norm)
    const slug = slugify(raw)
    if (bySlug.has(slug)) return bySlug.get(slug)
    if (SYNONYMS[norm]) {
      const target = SYNONYMS[norm]
      if (bySlug.has(target)) return bySlug.get(target)
    }
    for (const [synKey, synSlug] of Object.entries(SYNONYMS)) {
      if (norm.includes(synKey)) {
        if (bySlug.has(synSlug)) return bySlug.get(synSlug)
      }
    }
    for (const [styleSlug, styleObj] of bySlug.entries()) {
      if (norm.includes(styleSlug.replace(/-/g, " "))) return styleObj
    }
    return null
  }

  const products = await productModule.listProducts({}, {
    select: ["id", "title", "metadata"],
    take: null,
  } as any)

  logger.info(`[Backfill] Scanning ${products.length} products...`)

  const { data: linked } = await query.graph({
    entity: "product",
    fields: ["id", "beer_style.id"],
    filters: {},
    pagination: { take: null } as any,
  })
  const linkedIds = new Set<string>(
    (linked || []).filter((p: any) => p.beer_style != null).map((p: any) => p.id)
  )

  let linkedCount = 0
  let alreadyLinked = 0
  const unmatched: string[] = []
  const noStyle: string[] = []

  for (const product of products) {
    if (linkedIds.has(product.id)) {
      alreadyLinked++
      continue
    }
    const meta = (product as any).metadata || {}
    const rawStyle = meta.style as string | undefined
    if (!rawStyle || typeof rawStyle !== "string" || !rawStyle.trim()) {
      noStyle.push(`${product.id} — ${product.title}`)
      continue
    }

    const style = resolveStyle(rawStyle, Number(meta.abv) || 0)
    if (!style) {
      unmatched.push(`${product.id} — ${product.title} — metadata.style="${rawStyle}"`)
      continue
    }

    if (!dryRun) {
      try {
        await link.create({
          beerStyle: { beer_style_id: style.id },
          product: { product_id: product.id },
        })
      } catch (err: any) {
        logger.warn(`[Backfill] Link failed for ${product.id}: ${err?.message || err}`)
        continue
      }
    }
    linkedCount++
  }

  logger.info(
    `[Backfill] Summary: already_linked=${alreadyLinked}, linked=${linkedCount}, no_metadata_style=${noStyle.length}, unmatched=${unmatched.length}`
  )
  if (unmatched.length > 0) {
    logger.warn(
      `[Backfill] Unmatched products (need manual review):\n  - ${unmatched.slice(0, 50).join("\n  - ")}${unmatched.length > 50 ? `\n  ...and ${unmatched.length - 50} more` : ""}`
    )
  }
  if (noStyle.length > 0 && noStyle.length <= 20) {
    logger.info(`[Backfill] Products with no metadata.style:\n  - ${noStyle.join("\n  - ")}`)
  }
  if (dryRun) logger.info(`[Backfill] Re-run without --dry-run to write links.`)
}
