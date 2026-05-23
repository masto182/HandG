import type { ExecArgs } from "@medusajs/framework/types"

const CANONICAL_STYLES = [
  { name: "IPA", slug: "ipa", family: "IPA", description: "India Pale Ale — hop-forward with moderate to high bitterness and citrus, pine, or tropical hop character", sort_order: 1 },
  { name: "West Coast IPA", slug: "west-coast-ipa", family: "IPA", description: "Crisp, clear IPA with assertive bitterness, piney/citrus hops, and a dry finish", sort_order: 2 },
  { name: "NEIPA", slug: "neipa", family: "IPA", description: "New England IPA — hazy, juicy, low bitterness with tropical fruit hop aromatics", sort_order: 3 },
  { name: "Double IPA", slug: "double-ipa", family: "IPA", description: "Imperial/Double IPA — amplified hop intensity with higher ABV (7–10%)", sort_order: 4 },
  { name: "Triple IPA", slug: "triple-ipa", family: "IPA", description: "Triple IPA — extreme hop character with very high ABV (10%+)", sort_order: 5 },
  { name: "Cold IPA", slug: "cold-ipa", family: "IPA", description: "Lager-fermented IPA — clean, crisp with prominent hop aroma and light body", sort_order: 6 },
  { name: "Session IPA", slug: "session-ipa", family: "IPA", description: "Lower alcohol IPA (3–5%) with full hop character but easy-drinking body", sort_order: 7 },

  { name: "Pale Ale", slug: "pale-ale", family: "Pale Ale", description: "Balanced, approachable ale with moderate hop flavour and malt backbone", sort_order: 1 },
  { name: "XPA", slug: "xpa", family: "Pale Ale", description: "Extra Pale Ale — lighter body than a pale ale, hop-forward but sessionable", sort_order: 2 },
  { name: "Pacific Ale", slug: "pacific-ale", family: "Pale Ale", description: "Australian/NZ-style pale ale with Galaxy, Nelson Sauvin, or Motueka hops", sort_order: 3 },
  { name: "American Pale Ale", slug: "american-pale-ale", family: "Pale Ale", description: "American-hopped pale ale with citrus and pine character", sort_order: 4 },

  { name: "Stout", slug: "stout", family: "Stout", description: "Dark, roasty ale with coffee and chocolate flavours from roasted barley", sort_order: 1 },
  { name: "Imperial Stout", slug: "imperial-stout", family: "Stout", description: "High-ABV stout with intense roast, dark fruit, and often barrel-aged complexity", sort_order: 2 },
  { name: "Milk Stout", slug: "milk-stout", family: "Stout", description: "Sweet stout brewed with lactose for a creamy, smooth body", sort_order: 3 },
  { name: "Pastry Stout", slug: "pastry-stout", family: "Stout", description: "Dessert-inspired stout with adjuncts like vanilla, maple, cacao, and pastry flavours", sort_order: 4 },

  { name: "Sour", slug: "sour", family: "Sour", description: "Tart, acidic beer produced with wild yeast or souring bacteria", sort_order: 1 },
  { name: "Gose", slug: "gose", family: "Sour", description: "German-origin wheat sour with salt, coriander, and bright acidity", sort_order: 2 },
  { name: "Berliner Weisse", slug: "berliner-weisse", family: "Sour", description: "Light, effervescent German wheat sour — tart and refreshing at low ABV", sort_order: 3 },
  { name: "Fruit Sour", slug: "fruit-sour", family: "Sour", description: "Sour base with fruit additions (berry, stone fruit, citrus, tropical)", sort_order: 4 },
  { name: "Wild Ale", slug: "wild-ale", family: "Sour", description: "Spontaneously or mixed-fermented ale with complex funky, tart character", sort_order: 5 },

  { name: "Lager", slug: "lager", family: "Lager", description: "Clean, crisp bottom-fermented beer with subtle malt and hop balance", sort_order: 1 },
  { name: "Pilsner", slug: "pilsner", family: "Lager", description: "Pale lager with noble hop bitterness, floral aroma, and dry finish", sort_order: 2 },
  { name: "Helles", slug: "helles", family: "Lager", description: "Munich-style pale lager — malt-forward, bready, with gentle hop balance", sort_order: 3 },

  { name: "Porter", slug: "porter", family: "Dark", description: "Dark brown ale with chocolate, caramel, and mild roast character", sort_order: 1 },
  { name: "Brown Ale", slug: "brown-ale", family: "Dark", description: "Malt-focused ale with nutty, toffee, and mild chocolate notes", sort_order: 2 },
  { name: "Red Ale", slug: "red-ale", family: "Dark", description: "Amber-to-copper ale with caramel malt sweetness and moderate hop balance", sort_order: 3 },

  { name: "Hefeweizen", slug: "hefeweizen", family: "Wheat", description: "Bavarian wheat beer with banana and clove yeast character, hazy and effervescent", sort_order: 1 },
  { name: "Witbier", slug: "witbier", family: "Wheat", description: "Belgian white ale spiced with coriander and orange peel — light and refreshing", sort_order: 2 },

  { name: "Saison", slug: "saison", family: "Farmhouse", description: "Belgian farmhouse ale — dry, peppery, fruity with high carbonation", sort_order: 1 },

  { name: "Session Ale", slug: "session-ale", family: "Session", description: "Low-ABV ale (under 4%) designed for easy drinking over extended sessions", sort_order: 1 },
]

export default async function seedBeerStyles({ container }: ExecArgs) {
  const beerStyleService = container.resolve("beerStyle") as any
  const logger = container.resolve("logger") as any

  const existing = await beerStyleService.listBeerStyles()
  if (existing.length > 0) {
    logger.info(`[BeerStyles] ${existing.length} styles already exist. Skipping seed.`)
    return
  }

  logger.info(`[BeerStyles] Seeding ${CANONICAL_STYLES.length} canonical beer styles...`)
  await beerStyleService.createBeerStyles(CANONICAL_STYLES)
  logger.info(`[BeerStyles] Seed complete.`)
}
