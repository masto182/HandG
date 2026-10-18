import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import inventorySearchSync from "../../subscribers/inventory-search-sync"

function makeContainer(opts: { items?: any[]; graphError?: Error } = {}) {
  const emit = jest.fn()
  const graph = jest.fn(async () => {
    if (opts.graphError) throw opts.graphError
    return { data: opts.items ?? [] }
  })
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const inventoryModule = {
    listReservationItems: jest.fn(async () => [
      { inventory_item_id: "iitem_1" },
      { inventory_item_id: "iitem_1" },
    ]),
    listInventoryLevels: jest.fn(async () => [{ inventory_item_id: "iitem_2" }]),
  }
  const services: Record<string, unknown> = {
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.QUERY]: { graph },
    [Modules.INVENTORY]: inventoryModule,
    [Modules.EVENT_BUS]: { emit },
  }
  const container = { resolve: (k: string) => services[k] } as any
  return { container, emit, graph, logger, inventoryModule }
}

describe("inventory-search-sync subscriber", () => {
  it("queries inventory_item by id (not a linked-field filter) and re-emits product.updated once per product", async () => {
    const { container, emit, graph } = makeContainer({
      items: [
        {
          id: "iitem_1",
          variants: [
            { id: "v1", product_id: "prod_a" },
            { id: "v2", product_id: "prod_a" },
            { id: "v3", product_id: "prod_b" },
          ],
        },
      ],
    })

    await inventorySearchSync({
      event: { name: "inventory.reservation-item.created", data: { id: "resitem_1" } },
      container,
    } as any)

    expect(graph).toHaveBeenCalledWith({
      entity: "inventory_item",
      fields: ["id", "variants.id", "variants.product_id"],
      filters: { id: ["iitem_1"] },
    })
    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { name: "product.updated", data: { id: "prod_a" } },
      { name: "product.updated", data: { id: "prod_b" } },
    ])
  })

  it("resolves inventory levels for level events and handles bulk payloads", async () => {
    const { container, emit, inventoryModule } = makeContainer({
      items: [{ id: "iitem_2", variants: [{ id: "v9", product_id: "prod_c" }] }],
    })

    await inventorySearchSync({
      event: {
        name: "inventory.inventory-level.updated",
        data: [{ id: "lvl_1" }, { id: "lvl_2" }],
      },
      container,
    } as any)

    expect(inventoryModule.listInventoryLevels).toHaveBeenCalledWith({ id: ["lvl_1", "lvl_2"] })
    expect(emit).toHaveBeenCalledWith({ name: "product.updated", data: { id: "prod_c" } })
  })

  it("warns and emits nothing when the product lookup fails", async () => {
    const { container, emit, logger } = makeContainer({ graphError: new Error("boom") })

    await inventorySearchSync({
      event: { name: "inventory.reservation-item.deleted", data: { id: "resitem_1" } },
      container,
    } as any)

    expect(emit).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalled()
  })

  it("does nothing for an empty payload", async () => {
    const { container, emit, graph } = makeContainer()
    await inventorySearchSync({
      event: { name: "inventory.reservation-item.created", data: [] },
      container,
    } as any)
    expect(graph).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })
})
