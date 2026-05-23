import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { PICKUP_LOCATION_MODULE } from "../modules/pickup-location"
import type PickupLocationModuleService from "../modules/pickup-location/service"

/**
 * Consolidated, idempotent seed for the retail example.
 *
 * Bootstraps everything a fresh Medusa instance needs to accept its first
 * order: region, sales channel, default warehouse, two example pickup
 * locations, customer groups, fulfilment sets and shipping options, payment
 * provider links, and store-level defaults (currency + default region +
 * default location).
 *
 * Safe to re-run. Every step performs find-or-create or "already exists"
 * swallowing.
 *
 * Configuration via env (all optional):
 *   BRAND_NAME             default "Retail Example"
 *   DEFAULT_CURRENCY       default "usd"
 *   DEFAULT_COUNTRY        default "us"
 *   DEFAULT_REGION_NAME    default derived from country code
 *   SEED_TEST_ACCOUNTS     "true" to create example customer accounts
 *
 * Usage:
 *   pnpm exec medusa exec ./src/scripts/seed.ts
 */

const BRAND_NAME = process.env.BRAND_NAME || "Retail Example"
const CURRENCY = (process.env.DEFAULT_CURRENCY || "usd").toLowerCase()
const COUNTRY = (process.env.DEFAULT_COUNTRY || "us").toLowerCase()
const REGION_NAME =
  process.env.DEFAULT_REGION_NAME ||
  ({ us: "United States", au: "Australia", gb: "United Kingdom", ca: "Canada", nz: "New Zealand" } as Record<string, string>)[COUNTRY] ||
  COUNTRY.toUpperCase()

const WAREHOUSE_NAME = `${BRAND_NAME} Warehouse`
const SALES_CHANNEL_NAME = `${BRAND_NAME} Store`

const CUSTOMER_GROUPS = [
  "pending",
  "approved",
  "vip1",
  "vip2",
  "vip3",
  "vip4",
  "vip5",
  "suspended",
]

const PICKUP_LOCATIONS = [
  {
    slug: "downtown",
    stock_location_name: "Downtown Pickup",
    address: {
      address_1: "100 Main Street",
      city: "Springfield",
      country_code: COUNTRY,
      province: "",
      postal_code: "00000",
    },
    hours: [
      { day: "mon", open: "10:00", close: "18:00" },
      { day: "tue", open: "10:00", close: "18:00" },
      { day: "wed", open: "10:00", close: "18:00" },
      { day: "thu", open: "10:00", close: "20:00" },
      { day: "fri", open: "10:00", close: "20:00" },
      { day: "sat", open: "10:00", close: "17:00" },
    ],
    phone: null as string | null,
    notes: null as string | null,
    is_active: true,
    sort_order: 0,
  },
  {
    slug: "suburb",
    stock_location_name: "Suburb Pickup",
    address: {
      address_1: "53 Landscape Drive",
      city: "Suburbia",
      country_code: COUNTRY,
      province: "",
      postal_code: "00001",
    },
    hours: [
      { day: "thu", open: "16:00", close: "20:00" },
      { day: "fri", open: "16:00", close: "20:00" },
      { day: "sat", open: "12:00", close: "18:00" },
    ],
    phone: null as string | null,
    notes: "Pickup window confirmed at booking.",
    is_active: true,
    sort_order: 1,
  },
]

export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const storeModule = container.resolve(Modules.STORE)
  const regionModule = container.resolve(Modules.REGION)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const paymentModule = container.resolve(Modules.PAYMENT)
  const pickupSvc = container.resolve(PICKUP_LOCATION_MODULE) as PickupLocationModuleService

  logger.info(`Starting ${BRAND_NAME} seed (currency=${CURRENCY}, country=${COUNTRY})...`)

  // ---------------------------------------------------------------------------
  // 1. Region
  // ---------------------------------------------------------------------------
  let [region] = await regionModule.listRegions({ currency_code: CURRENCY })
  if (!region) {
    region = await regionModule.createRegions({
      name: REGION_NAME,
      currency_code: CURRENCY,
      countries: [COUNTRY],
    })
    logger.info(`Created region: ${region.name} (${region.id})`)
  } else {
    logger.info(`Region ${region.name} already exists: ${region.id}`)
  }

  // ---------------------------------------------------------------------------
  // 2. Sales channel
  // ---------------------------------------------------------------------------
  let [salesChannel] = await salesChannelModule.listSalesChannels({ name: SALES_CHANNEL_NAME })
  if (!salesChannel) {
    salesChannel = await salesChannelModule.createSalesChannels({
      name: SALES_CHANNEL_NAME,
      description: "Primary online sales channel",
      is_disabled: false,
    })
    logger.info(`Created sales channel: ${salesChannel.id}`)
  } else {
    logger.info(`Sales channel already exists: ${salesChannel.id}`)
  }

  // ---------------------------------------------------------------------------
  // 3. Stock locations: warehouse + pickup destinations
  // ---------------------------------------------------------------------------
  async function findOrCreateStockLocation(name: string, address: any) {
    const [existing] = await stockLocationModule.listStockLocations({ name })
    if (existing) return existing
    const created = await stockLocationModule.createStockLocations({ name, address })
    logger.info(`  Created stock location "${name}": ${created.id}`)
    return created
  }

  const warehouse = await findOrCreateStockLocation(WAREHOUSE_NAME, {
    address_1: "1 Warehouse Way",
    city: "Springfield",
    country_code: COUNTRY,
    province: "",
    postal_code: "00000",
  })

  const pickupStockLocations: Record<string, any> = {}
  for (const pl of PICKUP_LOCATIONS) {
    pickupStockLocations[pl.slug] = await findOrCreateStockLocation(
      pl.stock_location_name,
      pl.address
    )
  }

  // ---------------------------------------------------------------------------
  // 4. Customer groups
  // ---------------------------------------------------------------------------
  for (const name of CUSTOMER_GROUPS) {
    const [existing] = await customerModule.listCustomerGroups({ name })
    if (existing) continue
    await customerModule.createCustomerGroups({ name })
  }
  logger.info(`Customer groups ensured: ${CUSTOMER_GROUPS.join(", ")}`)

  // ---------------------------------------------------------------------------
  // 5. Fulfilment: shipping set + pickup sets, manual provider only
  // ---------------------------------------------------------------------------
  const providers = await fulfillmentModule.listFulfillmentProviders()
  const manualProvider = providers.find((p: any) => p.id.includes("manual"))
  if (!manualProvider) {
    logger.warn("No manual fulfilment provider found. Skipping shipping options.")
  }

  const [shippingProfile] = await fulfillmentModule.listShippingProfiles()
  if (!shippingProfile) {
    logger.warn("No shipping profile found. Skipping shipping options.")
  }

  async function findOrCreateFulfillmentSet(name: string, type: string) {
    const [existing] = await fulfillmentModule.listFulfillmentSets({ name })
    if (existing) return existing
    const created = await fulfillmentModule.createFulfillmentSets({ name, type })
    logger.info(`  Created fulfilment set "${name}": ${created.id}`)
    return created
  }

  async function findOrCreateServiceZone(name: string, fulfillment_set_id: string) {
    const [existing] = await fulfillmentModule.listServiceZones({ name })
    if (existing) return existing
    const created = await fulfillmentModule.createServiceZones({
      name,
      fulfillment_set_id,
      geo_zones: [{ type: "country", country_code: COUNTRY }],
    })
    logger.info(`  Created service zone "${name}": ${created.id}`)
    return created
  }

  async function findOrCreateShippingOption(name: string, opts: any) {
    const [existing] = await fulfillmentModule.listShippingOptions({ name })
    if (existing) return existing
    const created = (await fulfillmentModule.createShippingOptions(opts)) as any
    logger.info(`  Created shipping option "${name}": ${created.id}`)
    return created
  }

  async function safeLink(payload: any, label: string) {
    try {
      await link.create(payload)
      logger.info(`  Linked ${label}`)
    } catch (e: any) {
      if (!e.message?.includes("already exists")) throw e
    }
  }

  if (manualProvider && shippingProfile) {
    const profileId = shippingProfile.id

    // 5a. Shipping (delivery from warehouse) — manual flat-rate placeholder.
    // Adopters typically replace this with a calculated provider (ShipEngine,
    // AusPost, EasyPost, etc.) registered in medusa-config.ts.
    const shippingSet = await findOrCreateFulfillmentSet("Shipping", "shipping")
    const shippingZone = await findOrCreateServiceZone(`${REGION_NAME} Shipping`, shippingSet.id)
    await findOrCreateShippingOption("Standard Shipping", {
      name: "Standard Shipping",
      price_type: "flat",
      service_zone_id: shippingZone.id,
      shipping_profile_id: profileId,
      provider_id: manualProvider.id,
      type: { label: "Shipping", description: "Flat-rate delivery", code: "standard" },
      rules: [],
    })
    await safeLink(
      {
        [Modules.STOCK_LOCATION]: { stock_location_id: warehouse.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: shippingSet.id },
      },
      `warehouse → shipping set`
    )

    // 5b. Pickup sets, one per pickup location
    for (const pl of PICKUP_LOCATIONS) {
      const setName = `Pickup - ${pl.stock_location_name}`
      const zoneName = `${pl.stock_location_name} Pickup`
      const pickupSet = await findOrCreateFulfillmentSet(setName, "pickup")
      const pickupZone = await findOrCreateServiceZone(zoneName, pickupSet.id)
      await findOrCreateShippingOption(pl.stock_location_name, {
        name: pl.stock_location_name,
        price_type: "flat",
        service_zone_id: pickupZone.id,
        shipping_profile_id: profileId,
        provider_id: manualProvider.id,
        type: {
          label: "Pickup",
          description: `Collect from ${pl.stock_location_name}`,
          code: `pickup-${pl.slug}`,
        },
        rules: [],
      })
      await safeLink(
        {
          [Modules.STOCK_LOCATION]: { stock_location_id: pickupStockLocations[pl.slug].id },
          [Modules.FULFILLMENT]: { fulfillment_set_id: pickupSet.id },
        },
        `${pl.stock_location_name} → pickup set`
      )
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Payment provider link (system default; adopters add Stripe/PayPal/etc.)
  // ---------------------------------------------------------------------------
  const paymentProviders = await paymentModule.listPaymentProviders()
  for (const pid of ["pp_system_default"]) {
    if (!paymentProviders.find((p: any) => p.id === pid)) continue
    try {
      await remoteLink.create({
        [Modules.REGION]: { region_id: region.id },
        [Modules.PAYMENT]: { payment_provider_id: pid },
      })
      logger.info(`  Linked payment provider ${pid} → ${region.name}`)
    } catch (e: any) {
      if (!e.message?.includes("already exists")) throw e
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Pickup-location module rows (storefront pickup hours/notes/sort_order)
  // ---------------------------------------------------------------------------
  for (const pl of PICKUP_LOCATIONS) {
    const stockLoc = pickupStockLocations[pl.slug]
    const existing = await (pickupSvc as any).listPickupLocations({ slug: pl.slug })
    if (existing?.length) {
      await (pickupSvc as any).updatePickupLocations({
        selector: { id: existing[0].id },
        data: {
          stock_location_id: stockLoc.id,
          hours: pl.hours,
          phone: pl.phone,
          notes: pl.notes,
          is_active: pl.is_active,
          sort_order: pl.sort_order,
        },
      })
      logger.info(`  Updated pickup location row "${pl.slug}"`)
    } else {
      await (pickupSvc as any).createPickupLocations({
        stock_location_id: stockLoc.id,
        slug: pl.slug,
        hours: pl.hours,
        phone: pl.phone,
        notes: pl.notes,
        is_active: pl.is_active,
        sort_order: pl.sort_order,
      })
      logger.info(`  Created pickup location row "${pl.slug}"`)
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Store defaults (currency + default region + default location)
  // ---------------------------------------------------------------------------
  const stores = await (storeModule as any).listStores({}, { take: 1 })
  const store = Array.isArray(stores) ? stores[0] : stores
  if (store) {
    await (storeModule as any).updateStores(store.id, {
      name: BRAND_NAME,
      supported_currencies: [{ currency_code: CURRENCY, is_default: true }],
      default_region_id: region.id,
      default_location_id: warehouse.id,
    })
    logger.info(`Store defaults applied: name=${BRAND_NAME}, currency=${CURRENCY.toUpperCase()}`)
  } else {
    logger.warn("No store found — skipping store defaults.")
  }

  // ---------------------------------------------------------------------------
  // 9. Optional: example customer accounts (gated by SEED_TEST_ACCOUNTS=true)
  // ---------------------------------------------------------------------------
  if (process.env.SEED_TEST_ACCOUNTS === "true") {
    const { createCustomerAccountWorkflow } = await import("@medusajs/medusa/core-flows")
    const authModule = container.resolve(Modules.AUTH) as any
    const workflow = createCustomerAccountWorkflow(container)

    const accounts = [
      { email: "approved@example.test", password: "TestApproved123!", group: "approved" },
      { email: "vip@example.test", password: "TestVip123!", group: "vip3" },
      { email: "pending@example.test", password: "TestPending123!", group: "pending" },
    ]

    for (const acct of accounts) {
      const existing = await customerModule.listCustomers({ email: acct.email })
      if (existing.length) continue

      try {
        const reg = await authModule.register("emailpass", {
          body: { email: acct.email, password: acct.password },
        } as any)
        const token: string =
          typeof reg === "string" ? reg : reg?.authIdentity?.id ?? reg?.location ?? reg?.id
        if (!token) continue

        const authIdentityId = token.includes(".")
          ? JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8")).auth_identity_id
          : token

        const { result } = await workflow.run({
          input: {
            authIdentityId,
            customerData: {
              email: acct.email,
              first_name: acct.group,
              last_name: "TestUser",
              metadata: { status: acct.group === "pending" ? "pending" : "active" },
            },
          } as any,
        })
        const customerId = (result as any).id

        let [group] = await customerModule.listCustomerGroups({ name: acct.group })
        if (!group) group = await customerModule.createCustomerGroups({ name: acct.group })
        await customerModule.addCustomerToGroup({
          customer_id: customerId,
          customer_group_id: group.id,
        })
        logger.info(`  Created example account ${acct.email} in group ${acct.group}`)
      } catch (err) {
        logger.warn(
          `  Example account ${acct.email} skipped: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  }

  logger.info("=== SEED COMPLETE ===")
  logger.info("Next steps:")
  logger.info("  1. Set shipping prices via admin (POST /admin/shipping-options/<id>)")
  logger.info("  2. Import products (custom import script or admin UI)")
  logger.info("  3. Link products to the default shipping profile")
}
