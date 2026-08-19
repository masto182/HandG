import type { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { PICKUP_LOCATION_MODULE } from "../modules/pickup-location"
import type PickupLocationModuleService from "../modules/pickup-location/service"

/**
 * One-off data fix (idempotent, safe to re-run):
 *
 * 1. Realigns pickup_location.slug back to the canonical seed values
 *    ("downtown" / "suburb") wherever an admin renamed them to something
 *    else (e.g. "MelCBD" / "Hillside"). The shipping option type.code
 *    (pickup-downtown / pickup-suburb) is immutable once created, so the
 *    slug must match it for the storefront to resolve an address.
 * 2. Sets the linked stock_location's real display name + address, so the
 *    checkout picker (after the storefront display fix) shows the correct
 *    customer-facing name instead of the seed placeholder.
 *
 * Run via: npx medusa exec ./src/scripts/fix-pickup-locations.ts
 */

const CANONICAL = [
  {
    slug: "downtown",
    aliases: ["downtown", "MelCBD", "melcbd"],
    name: "CBD Meetup",
    address: {
      address_1: "Cnr Little Collins & Queen Street",
      city: "Melbourne",
      province: "VIC",
      postal_code: "3000",
      country_code: "au",
    },
  },
  {
    slug: "suburb",
    aliases: ["suburb", "Hillside", "hillside"],
    name: "Hillside Pickup",
    address: {
      address_1: "53 Landscape Drive",
      city: "Hillside",
      province: "VIC",
      postal_code: "3037",
      country_code: "au",
    },
  },
]

export default async function fixPickupLocations({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const pickupSvc = container.resolve(PICKUP_LOCATION_MODULE) as PickupLocationModuleService

  for (const c of CANONICAL) {
    const rows = await pickupSvc.listPickupLocations({ slug: c.aliases })
    if (rows.length === 0) {
      logger.warn(`No pickup_location row found for aliases [${c.aliases.join(", ")}] — skipping`)
      continue
    }
    if (rows.length > 1) {
      logger.warn(
        `Multiple pickup_location rows matched aliases [${c.aliases.join(", ")}]: ${rows
          .map((r: any) => r.id)
          .join(", ")} — fix manually, skipping`
      )
      continue
    }

    const row = rows[0] as any

    if (row.slug !== c.slug) {
      await pickupSvc.updatePickupLocations({ selector: { id: row.id }, data: { slug: c.slug } })
      logger.info(`  Renamed pickup_location slug "${row.slug}" -> "${c.slug}" (${row.id})`)
    } else {
      logger.info(`  pickup_location slug "${c.slug}" already correct (${row.id})`)
    }

    const stockLoc = await stockLocationModule.retrieveStockLocation(row.stock_location_id, {
      relations: ["address"],
    })

    const needsNameUpdate = stockLoc.name !== c.name
    const addr = stockLoc.address as any
    const needsAddressUpdate =
      !addr ||
      addr.address_1 !== c.address.address_1 ||
      addr.city !== c.address.city ||
      addr.province !== c.address.province ||
      addr.postal_code !== c.address.postal_code ||
      addr.country_code !== c.address.country_code

    if (needsNameUpdate || needsAddressUpdate) {
      await stockLocationModule.updateStockLocations(stockLoc.id, {
        name: c.name,
        address: c.address,
      })
      logger.info(`  Updated stock_location "${stockLoc.name}" -> "${c.name}" (${stockLoc.id})`)
    } else {
      logger.info(`  stock_location "${c.name}" already correct (${stockLoc.id})`)
    }
  }

  logger.info("fix-pickup-locations complete.")
}
