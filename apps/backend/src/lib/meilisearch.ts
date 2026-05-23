import { requireEnv } from "./env"

const MEILI_HOST = process.env.MEILI_HOST || "http://localhost:7700"
const MEILI_MASTER_KEY = requireEnv("MEILI_MASTER_KEY", "dev-meili-master-key")

export const PRODUCTS_INDEX = "products"

let client: any = null
let MeiliClass: any = null

async function loadMeili() {
  if (!MeiliClass) {
    const mod: any = await import("meilisearch")
    MeiliClass = mod.Meilisearch || mod.default?.Meilisearch || mod.default
  }
  return MeiliClass
}

export async function getMeiliClient() {
  if (!client) {
    const Meili = await loadMeili()
    client = new Meili({
      host: MEILI_HOST,
      apiKey: MEILI_MASTER_KEY,
    })
  }
  return client
}

export async function configureIndex() {
  const meili = await getMeiliClient()
  const index = meili.index(PRODUCTS_INDEX)

  await index.updateRankingRules([
    "typo",
    "words",
    "proximity",
    "attribute",
    "sort",
    "exactness",
  ])

  await index.updateFilterableAttributes([
    "brewery",
    "style",
    "style_family",
    "hops",
    "is_collab",
    "abv",
    "packaged_at_ts",
    "created_at_ts",
  ])

  await index.updateFaceting({ maxValuesPerFacet: 100 })

  await index.updateSortableAttributes([
    "created_at_ts",
    "abv",
    "title",
    "untappd_score",
  ])

  await index.updateSearchableAttributes([
    "title",
    "brewery",
    "style",
    "hops",
    "description",
  ])

  await index.updateSynonyms({
    ipa: ["india pale ale", "indian pale ale"],
    neipa: ["new england ipa", "hazy ipa", "ne ipa"],
    dipa: ["double ipa", "imperial ipa", "iipa"],
    tipa: ["triple ipa"],
    "double ipa": ["dipa", "imperial ipa"],
    "triple ipa": ["tipa"],
    hazy: ["neipa", "new england"],
    "west coast": ["wc"],
    stout: ["imperial stout", "milk stout"],
    sour: ["berliner weisse", "gose", "lambic", "saison"],
    ddh: ["double dry hopped"],
    tdh: ["triple dry hopped"],
    lager: ["pilsner", "helles", "kolsch", "beer"],
    pilsner: ["lager", "pils"],
    beer: ["ale", "lager", "stout", "ipa"],
    pale: ["pale ale", "apa", "american pale"],
    porter: ["robust porter", "brown porter", "baltic porter"],
    wheat: ["weizen", "hefeweizen", "witbier", "white"],
    amber: ["red ale", "vienna lager", "marzen"],
    session: ["low abv", "session ipa", "session stout"],
    fruited: ["fruit beer", "fruit sour"],
  })

  return index
}
