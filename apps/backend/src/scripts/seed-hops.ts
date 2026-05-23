import type { ExecArgs } from "@medusajs/framework/types"
import { HOP_MODULE } from "../modules/hop"

const HOPS = [
  { name: "Citra", slug: "citra", origin: "USA - Yakima Valley", flavor_profile: "Tropical, citrus, grapefruit, passionfruit" },
  { name: "Mosaic", slug: "mosaic", origin: "USA - Yakima Valley", flavor_profile: "Berry, tropical, herbal, earthy" },
  { name: "Simcoe", slug: "simcoe", origin: "USA - Yakima Valley", flavor_profile: "Pine, citrus, earthy, passionfruit" },
  { name: "Galaxy", slug: "galaxy", origin: "Australia - Victoria", flavor_profile: "Passionfruit, peach, citrus, tropical" },
  { name: "Nelson Sauvin", slug: "nelson-sauvin", origin: "New Zealand - Nelson", flavor_profile: "White wine, gooseberry, grapefruit" },
  { name: "Centennial", slug: "centennial", origin: "USA - Yakima Valley", flavor_profile: "Floral, citrus, lemon" },
  { name: "Cascade", slug: "cascade", origin: "USA - Oregon", flavor_profile: "Floral, citrus, grapefruit, spicy" },
  { name: "Amarillo", slug: "amarillo", origin: "USA - Washington", flavor_profile: "Orange, floral, tropical, grapefruit" },
  { name: "El Dorado", slug: "el-dorado", origin: "USA - Washington", flavor_profile: "Tropical, stone fruit, candy, watermelon" },
  { name: "Sabro", slug: "sabro", origin: "USA - New Mexico", flavor_profile: "Coconut, tangerine, tropical, mint" },
  { name: "Strata", slug: "strata", origin: "USA - Oregon", flavor_profile: "Passionfruit, cannabis, strawberry, dank" },
  { name: "Chinook", slug: "chinook", origin: "USA - Washington", flavor_profile: "Pine, grapefruit, spicy" },
  { name: "Columbus", slug: "columbus", origin: "USA - Washington", flavor_profile: "Herbal, earthy, spicy, dank" },
  { name: "Idaho 7", slug: "idaho-7", origin: "USA - Idaho", flavor_profile: "Stone fruit, tropical, pine, black tea" },
  { name: "Talus", slug: "talus", origin: "USA - Idaho", flavor_profile: "Pink guava, coconut, tropical" },
  { name: "Azacca", slug: "azacca", origin: "USA - Washington", flavor_profile: "Tropical, mango, pineapple, citrus" },
  { name: "Cashmere", slug: "cashmere", origin: "USA - Washington", flavor_profile: "Melon, lemon, lime, herbal" },
  { name: "HBC 586", slug: "hbc-586", origin: "USA - Yakima Valley", flavor_profile: "Coconut, tropical, sweet fruit" },
  { name: "HBC 472", slug: "hbc-472", origin: "USA - Yakima Valley", flavor_profile: "Stone fruit, melon, tropical" },
  { name: "Sultana", slug: "sultana", origin: "USA - Washington", flavor_profile: "Pineapple, tangerine, apricot" },
  { name: "Triumph", slug: "triumph", origin: "USA - Yakima Valley", flavor_profile: "Stone fruit, citrus, floral" },
  { name: "Cryo Citra", slug: "cryo-citra", origin: "USA - Yakima Valley", flavor_profile: "Intensified tropical, citrus, grapefruit" },
  { name: "Cryo Mosaic", slug: "cryo-mosaic", origin: "USA - Yakima Valley", flavor_profile: "Intensified berry, tropical" },
  { name: "Vic Secret", slug: "vic-secret", origin: "Australia - Victoria", flavor_profile: "Pineapple, pine, passionfruit, herbs" },
  { name: "Enigma", slug: "enigma", origin: "Australia - Tasmania", flavor_profile: "Redcurrant, raspberry, wine, pine" },
  { name: "Ella", slug: "ella", origin: "Australia - Tasmania", flavor_profile: "Spicy, floral, anise, grapefruit" },
  { name: "Topaz", slug: "topaz", origin: "Australia - Tasmania", flavor_profile: "Lychee, citrus, resinous" },
  { name: "Summer", slug: "summer", origin: "Australia - Tasmania", flavor_profile: "Apricot, melon, citrus" },
  { name: "Helga", slug: "helga", origin: "Australia - Tasmania", flavor_profile: "Floral, herbal, delicate" },
  { name: "Eclipse", slug: "eclipse", origin: "Australia - Victoria", flavor_profile: "Tropical, resinous, citrus" },
  { name: "Motueka", slug: "motueka", origin: "New Zealand - Nelson", flavor_profile: "Tropical, lime, lemon zest" },
  { name: "Riwaka", slug: "riwaka", origin: "New Zealand - Motueka Valley", flavor_profile: "Passionfruit, grapefruit, citrus" },
  { name: "Nectaron", slug: "nectaron", origin: "New Zealand - Nelson", flavor_profile: "Pineapple, stone fruit, grapefruit" },
  { name: "Kohatu", slug: "kohatu", origin: "New Zealand", flavor_profile: "Tropical, pine needle, fresh cut grass" },
  { name: "Wai-iti", slug: "wai-iti", origin: "New Zealand - Nelson", flavor_profile: "Lime, mandarin, floral" },
  { name: "Rakau", slug: "rakau", origin: "New Zealand", flavor_profile: "Stone fruit, apricot, fig" },
  { name: "Wakatu", slug: "wakatu", origin: "New Zealand", flavor_profile: "Floral, lime, lemon" },
  { name: "Moutere", slug: "moutere", origin: "New Zealand - Nelson", flavor_profile: "Lime, pine, tropical" },
  { name: "Hallertau Blanc", slug: "hallertau-blanc", origin: "Germany", flavor_profile: "White wine, gooseberry, lemongrass" },
  { name: "Hallertau Mittelfruh", slug: "hallertau-mittelfruh", origin: "Germany - Bavaria", flavor_profile: "Floral, spicy, herbal, mild" },
  { name: "Saaz", slug: "saaz", origin: "Czech Republic - Bohemia", flavor_profile: "Earthy, spicy, herbal, mild" },
  { name: "Tettnang", slug: "tettnang", origin: "Germany - Baden-Württemberg", flavor_profile: "Spicy, herbal, floral, mild" },
  { name: "Fuggle", slug: "fuggle", origin: "England - Kent", flavor_profile: "Earthy, woody, mild, floral" },
  { name: "East Kent Golding", slug: "east-kent-golding", origin: "England - Kent", flavor_profile: "Spicy, floral, honey, earthy" },
  { name: "Sorachi Ace", slug: "sorachi-ace", origin: "Japan - Hokkaido", flavor_profile: "Lemon, dill, tea, coconut" },
  { name: "Mandarina Bavaria", slug: "mandarina-bavaria", origin: "Germany - Bavaria", flavor_profile: "Mandarin, citrus, sweet" },
  { name: "Huell Melon", slug: "huell-melon", origin: "Germany - Bavaria", flavor_profile: "Honeydew melon, strawberry" },
  { name: "Perle", slug: "perle", origin: "Germany", flavor_profile: "Spicy, floral, minty, fruity" },
  { name: "Warrior", slug: "warrior", origin: "USA - Yakima Valley", flavor_profile: "Clean bittering, mild citrus" },
  { name: "Magnum", slug: "magnum", origin: "Germany", flavor_profile: "Clean bittering, subtle fruit" },
  { name: "Centennial", slug: "centennial", origin: "USA - Yakima Valley", flavor_profile: "Floral, citrus, clean" },
  { name: "Nugget", slug: "nugget", origin: "USA - Oregon", flavor_profile: "Herbal, spicy, heavy bittering" },
  { name: "Loral", slug: "loral", origin: "USA - Yakima Valley", flavor_profile: "Floral, citrus, pepper, dark fruit" },
  { name: "Lotus", slug: "lotus", origin: "USA - Washington", flavor_profile: "Orange, vanilla, tropical" },
  { name: "Bru-1", slug: "bru-1", origin: "USA - Michigan", flavor_profile: "Stone fruit, pineapple, tropical" },
  { name: "Krush", slug: "krush", origin: "USA - Yakima Valley", flavor_profile: "Lemon, lime, herbal, orange" },
  { name: "Phantasm", slug: "phantasm", origin: "New Zealand", flavor_profile: "Thiol-releasing, tropical, passionfruit" },
  { name: "Superdelic", slug: "superdelic", origin: "Australia - Tasmania", flavor_profile: "Tropical, mango, guava" },
]

export default async function seedHops({ container }: ExecArgs) {
  const hopService = container.resolve(HOP_MODULE) as any

  console.log(`[Seed Hops] Seeding ${HOPS.length} hop varieties...`)

  let created = 0
  let skipped = 0

  for (const hop of HOPS) {
    const existing = await hopService.listHops({ slug: hop.slug })
    if (existing.length > 0) {
      skipped++
      continue
    }

    await hopService.createHops({
      name: hop.name,
      slug: hop.slug,
      origin: hop.origin,
      flavor_profile: hop.flavor_profile,
      is_active: true,
    })
    created++
  }

  console.log(`[Seed Hops] Done: ${created} created, ${skipped} already existed.`)
}
