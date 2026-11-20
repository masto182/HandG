import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  listSpecialsRecipients,
  NoActiveSpecialsError,
  sendSpecialsBatch,
} from "../../workflows/send-specials-batch"

const eligibleRows = [
  {
    price_list_id: "pl_1",
    sale_amount: 18,
    base_amount: 24,
    product_id: "prod_1",
    product_title: "Alpha",
    product_handle: "alpha",
    product_thumbnail: null,
  },
  {
    price_list_id: "pl_2",
    sale_amount: 16,
    base_amount: 22,
    product_id: "prod_2",
    product_title: "Beta",
    product_handle: "beta",
    product_thumbnail: "https://cdn.example.com/beta.jpg",
  },
]

const productGraphRows = [
  {
    id: "prod_1",
    metadata: { brewery_slug: "alpha-brew", brewery_name: "Alpha Brew" },
    breweries: [
      { id: "brew_1", name: "Alpha Brew", slug: "alpha-brew" },
      { id: "brew_2", name: "Collab Brew", slug: "collab-brew" },
    ],
  },
  {
    id: "prod_2",
    metadata: { brewery: "Fallback Brew" },
    breweries: [],
  },
]

function createContainer(
  overrides: {
    segmentAll?: string[]
    orderedCustomerIds?: string[]
    optedOutRows?: any[]
    customers?: any[]
    loginMap?: Map<string, string>
    listSpecialsBatches?: any[]
  } = {}
) {
  const createSpecialsBatches = jest.fn().mockResolvedValue({ id: "batch_1" })
  const createSpecialsBatchItems = jest
    .fn()
    .mockImplementation(async (items: any[]) =>
      items.map((item, index) => ({ id: `item_${index + 1}`, ...item }))
    )
  const createSpecialsBatchRecipients = jest.fn().mockImplementation(async (input: any) => ({
    id: `recipient_${input.customer_id}`,
    ...input,
  }))
  const createSpecialsEmailDeliveries = jest.fn().mockImplementation(async (input: any) => ({
    id: `delivery_${input.recipient_id}`,
    ...input,
  }))
  const updateSpecialsBatches = jest.fn().mockResolvedValue(undefined)
  const retrieveSpecialsBatch = jest.fn().mockResolvedValue({ id: "batch_1", status: "sending" })
  const deleteSpecialsEmailDeliveries = jest.fn().mockResolvedValue(undefined)
  const deleteSpecialsBatchRecipients = jest.fn().mockResolvedValue(undefined)
  const deleteSpecialsBatchItems = jest.fn().mockResolvedValue(undefined)
  const deleteSpecialsBatches = jest.fn().mockResolvedValue(undefined)
  const listNotificationPreferences = jest
    .fn()
    .mockResolvedValue(overrides.optedOutRows ?? [{ customer_id: "cust_opted_out" }])
  const listCustomers = jest.fn().mockImplementation(async (filters: any) =>
    (
      overrides.customers ?? [
        { id: "cust_logged", email: "logged@example.com", first_name: "Log", last_name: "Ged" },
        { id: "cust_order_only", email: null, first_name: "Order", last_name: "Only" },
        { id: "cust_idle", email: null, first_name: null, last_name: null },
        { id: "cust_opted_out", email: "opted@example.com", first_name: "Opted", last_name: "Out" },
      ]
    ).filter((customer) => !filters?.id || filters.id.includes(customer.id))
  )
  const resolveSegment = jest.fn().mockImplementation(async (_container: any, filter: any) => {
    if (filter?.has_ordered) {
      return overrides.orderedCustomerIds ?? ["cust_order_only"]
    }
    return overrides.segmentAll ?? ["cust_logged", "cust_order_only", "cust_idle", "cust_opted_out"]
  })
  const getLastActiveByCustomerIds = jest
    .fn()
    .mockResolvedValue(overrides.loginMap ?? new Map([["cust_logged", "2026-11-20T00:00:00.000Z"]]))
  const pgConnection = { raw: jest.fn().mockResolvedValue({ rows: eligibleRows }) }
  const query = { graph: jest.fn().mockResolvedValue({ data: productGraphRows }) }
  const logger = { warn: jest.fn() }
  const specialsBatchService = {
    listSpecialsBatches: jest.fn().mockResolvedValue(overrides.listSpecialsBatches ?? []),
    createSpecialsBatches,
    createSpecialsBatchItems,
    createSpecialsBatchRecipients,
    createSpecialsEmailDeliveries,
    updateSpecialsBatches,
    retrieveSpecialsBatch,
    deleteSpecialsEmailDeliveries,
    deleteSpecialsBatchRecipients,
    deleteSpecialsBatchItems,
    deleteSpecialsBatches,
  }

  const container = {
    resolve: jest.fn((key: string) => {
      if (key === ContainerRegistrationKeys.PG_CONNECTION) {
        return pgConnection
      }
      if (key === ContainerRegistrationKeys.QUERY) {
        return query
      }
      if (key === "notificationPreference") {
        return { listNotificationPreferences }
      }
      if (key === Modules.CUSTOMER) {
        return { listCustomers }
      }
      if (key === "logger") {
        return logger
      }
      if (key === "analytics") {
        return { getLastActiveByCustomerIds }
      }
      if (key === "specialsBatch") {
        return specialsBatchService
      }
      throw new Error(`Unexpected resolve key: ${key}`)
    }),
  }

  return {
    container,
    createSpecialsBatches,
    createSpecialsBatchItems,
    createSpecialsBatchRecipients,
    createSpecialsEmailDeliveries,
    updateSpecialsBatches,
    retrieveSpecialsBatch,
    deleteSpecialsEmailDeliveries,
    deleteSpecialsBatchRecipients,
    deleteSpecialsBatchItems,
    deleteSpecialsBatches,
    listNotificationPreferences,
    listCustomers,
    resolveSegment,
    getLastActiveByCustomerIds,
    pgConnection,
  }
}

jest.mock("../../lib/resolve-broadcast-segment", () => ({
  resolveSegment: jest.fn(),
}))

const { resolveSegment } = jest.requireMock("../../lib/resolve-broadcast-segment") as {
  resolveSegment: jest.Mock
}

describe("send-specials-batch workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("filters selected products and excluded recipients, and persists a trimmed subject", async () => {
    const fx = createContainer()
    resolveSegment.mockImplementation(fx.resolveSegment)

    const result = await sendSpecialsBatch(fx.container, {
      product_ids: ["prod_2", "prod_1"],
      label: "Weekend",
      message: "Fresh markdown",
      subject: "  Custom subject  ",
      excluded_customer_ids: ["cust_opted_out", "unknown_customer"],
      created_by: "user_1",
    })

    expect(fx.createSpecialsBatches).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Custom subject",
        product_count: 2,
      })
    )
    expect(fx.createSpecialsBatchItems).toHaveBeenCalledWith([
      expect.objectContaining({ product_id: "prod_2", price_list_id: "pl_2" }),
      expect.objectContaining({ product_id: "prod_1", price_list_id: "pl_1" }),
    ])
    expect(fx.createSpecialsBatchItems.mock.calls[0][0][0]).not.toHaveProperty("brewery_id")
    expect(fx.createSpecialsBatchItems.mock.calls[0][0][0]).not.toHaveProperty("brewery_name")
    expect(fx.createSpecialsBatchRecipients).toHaveBeenCalledTimes(3)
    expect(fx.createSpecialsBatchRecipients).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: "cust_logged" })
    )
    expect(fx.createSpecialsBatchRecipients).not.toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: "cust_opted_out" })
    )
    expect(result.batch).toEqual({ id: "batch_1", status: "sending" })
  })

  it("stores null when the subject is blank", async () => {
    const fx = createContainer()
    resolveSegment.mockImplementation(fx.resolveSegment)

    await sendSpecialsBatch(fx.container, {
      product_ids: ["prod_1"],
      subject: "   ",
    })

    expect(fx.createSpecialsBatches).toHaveBeenCalledWith(
      expect.objectContaining({ subject: null })
    )
  })

  it("fails closed when a selected product is no longer eligible and creates nothing", async () => {
    const fx = createContainer()
    resolveSegment.mockImplementation(fx.resolveSegment)

    await expect(
      sendSpecialsBatch(fx.container, {
        product_ids: ["prod_1", "prod_missing"],
      })
    ).rejects.toEqual(expect.objectContaining({ productIds: ["prod_missing"] }))

    expect(fx.createSpecialsBatches).not.toHaveBeenCalled()
    expect(fx.createSpecialsBatchItems).not.toHaveBeenCalled()
    expect(fx.createSpecialsBatchRecipients).not.toHaveBeenCalled()
  })

  it("throws when no eligible specials remain", async () => {
    const fx = createContainer()
    resolveSegment.mockImplementation(fx.resolveSegment)
    fx.pgConnection.raw.mockResolvedValue({ rows: [] })

    await expect(
      sendSpecialsBatch(fx.container, { product_ids: ["prod_1"] })
    ).rejects.toBeInstanceOf(NoActiveSpecialsError)
  })

  it("lists recipients with activity and opt-out flags", async () => {
    const fx = createContainer()
    resolveSegment.mockImplementation(fx.resolveSegment)

    const recipients = await listSpecialsRecipients(fx.container)
    expect(recipients).toEqual([
      expect.objectContaining({
        customer_id: "cust_logged",
        has_logged_in: true,
        has_ordered: false,
        is_active: true,
        opted_out: false,
        label: "logged@example.com",
      }),
      expect.objectContaining({
        customer_id: "cust_order_only",
        has_logged_in: false,
        has_ordered: true,
        is_active: true,
        opted_out: false,
        label: "Order Only",
      }),
      expect.objectContaining({
        customer_id: "cust_idle",
        has_logged_in: false,
        has_ordered: false,
        is_active: false,
        opted_out: false,
        label: "cust_idle",
      }),
      expect.objectContaining({
        customer_id: "cust_opted_out",
        opted_out: true,
      }),
    ])
    expect(fx.getLastActiveByCustomerIds).toHaveBeenCalledWith([
      "cust_logged",
      "cust_order_only",
      "cust_idle",
      "cust_opted_out",
    ])
    expect(fx.listNotificationPreferences).toHaveBeenCalledWith({
      category: "specials",
      enabled: false,
    })
  })
})
