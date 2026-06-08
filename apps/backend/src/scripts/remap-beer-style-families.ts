import type { ExecArgs } from "@medusajs/framework/types"

const FAMILY_BY_SLUG: Record<string, string> = {
  ipa: "IPA",
  "west-coast-ipa": "IPA",
  neipa: "IPA",
  "double-ipa": "IPA",
  "triple-ipa": "IPA",
  "cold-ipa": "IPA",
  "session-ipa": "IPA",

  "pale-ale": "Pale Ale",
  xpa: "Pale Ale",
  "pacific-ale": "Pale Ale",
  "american-pale-ale": "Pale Ale",
  hefeweizen: "Pale Ale",
  witbier: "Pale Ale",

  stout: "Dark",
  "imperial-stout": "Dark",
  "milk-stout": "Dark",
  "pastry-stout": "Dark",
  porter: "Dark",
  "brown-ale": "Dark",
  "red-ale": "Dark",

  sour: "Sour",
  gose: "Sour",
  "berliner-weisse": "Sour",
  "fruit-sour": "Sour",
  "wild-ale": "Sour",
  saison: "Sour",

  lager: "Lager",
  pilsner: "Lager",
  helles: "Lager",
  "session-ale": "Lager",
}

export default async function remapBeerStyleFamilies({ container }: ExecArgs) {
  const beerStyleService = container.resolve("beerStyle") as any
  const logger = container.resolve("logger") as any

  const existing = await beerStyleService.listBeerStyles()
  const updates: any[] = []
  const unmapped: string[] = []

  for (const style of existing) {
    const targetFamily = FAMILY_BY_SLUG[style.slug]
    if (!targetFamily) {
      unmapped.push(`${style.slug} (current family: ${style.family})`)
      continue
    }
    if (style.family !== targetFamily) {
      updates.push({ id: style.id, family: targetFamily })
    }
  }

  if (unmapped.length > 0) {
    logger.warn(
      `[BeerStyles] ${unmapped.length} unmapped slugs (left untouched):\n  - ${unmapped.join("\n  - ")}`
    )
  }

  if (updates.length === 0) {
    logger.info(`[BeerStyles] All ${existing.length} styles already on the 5-bucket taxonomy.`)
    return
  }

  logger.info(`[BeerStyles] Updating family on ${updates.length} styles...`)
  await beerStyleService.updateBeerStyles(updates)
  logger.info(`[BeerStyles] Remap complete. Run reindex-search.ts to push new families to Meili.`)
}
