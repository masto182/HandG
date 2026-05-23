/**
 * Tests sendTemplate's gating logic. We avoid spinning up a real Resend
 * client by stubbing the Resend SDK module before importing email.ts.
 */

const sendMock = jest.fn(async () => ({ data: { id: "msg_test" }, error: null }))

jest.mock("resend", () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: { send: sendMock },
    })),
  }
})

import * as ApplicationReceived from "../../emails/application-received"
import * as RestockAvailable from "../../emails/restock-available"

describe("sendTemplate gating", () => {
  let originalKey: string | undefined

  beforeAll(() => {
    originalKey = process.env.RESEND_API_KEY
    process.env.RESEND_API_KEY = "re_test_key"
  })
  afterAll(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = originalKey
  })

  beforeEach(() => {
    sendMock.mockClear()
  })

  function makeContainer({
    customerExists = true,
    optedIn = true,
    notifModulePresent = true,
  }: {
    customerExists?: boolean
    optedIn?: boolean
    notifModulePresent?: boolean
  } = {}) {
    return {
      resolve(key: string) {
        if (key === "customer") {
          return {
            retrieveCustomer: async () => {
              if (!customerExists) throw new Error("not found")
              return { id: "cust_1" }
            },
          }
        }
        if (key === "notificationPreference") {
          if (!notifModulePresent) throw new Error("not registered")
          return { isOptedIn: async () => optedIn }
        }
        throw new Error(`unknown ${key}`)
      },
    }
  }

  it("returns no_resend_key when env unset", async () => {
    const saved = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY
    jest.resetModules()
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendTemplate } = require("../../lib/email")
    const result = await sendTemplate({
      to: "to@x.com",
      category: "applications",
      template: ApplicationReceived as any,
      props: { name: "X", storeUrl: "https://x" },
    })
    expect(result).toEqual({ sent: false, reason: "no_resend_key" })
    process.env.RESEND_API_KEY = saved
    jest.resetModules()
  })

  it("transactional always sends even with no container", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendTemplate } = require("../../lib/email")
    const result = await sendTemplate({
      to: "to@x.com",
      category: "applications",
      template: ApplicationReceived as any,
      props: { name: "X", storeUrl: "https://x" },
    })
    expect(result.sent).toBe(true)
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it("skips when customer missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendTemplate } = require("../../lib/email")
    const result = await sendTemplate({
      to: "to@x.com",
      customerId: "cust_1",
      category: "orders",
      template: ApplicationReceived as any,
      props: { name: "X", storeUrl: "https://x" },
      container: makeContainer({ customerExists: false }),
    })
    expect(result).toEqual({ sent: false, reason: "customer_missing" })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("marketing skipped on opt-out", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendTemplate } = require("../../lib/email")
    const result = await sendTemplate({
      to: "to@x.com",
      customerId: "cust_1",
      category: "restock_alerts",
      template: RestockAvailable as any,
      props: {
        name: "X",
        beerName: "Stout",
        breweryName: "BR",
        handle: "h",
        storeUrl: "https://x",
      },
      container: makeContainer({ optedIn: false }),
    })
    expect(result).toEqual({ sent: false, reason: "opted_out" })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("marketing sends when opted in", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendTemplate } = require("../../lib/email")
    const result = await sendTemplate({
      to: "to@x.com",
      customerId: "cust_1",
      category: "restock_alerts",
      template: RestockAvailable as any,
      props: {
        name: "X",
        beerName: "Stout",
        breweryName: "BR",
        handle: "h",
        storeUrl: "https://x",
      },
      container: makeContainer({ optedIn: true }),
    })
    expect(result).toEqual({ sent: true })
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it("marketing falls through to send when notif module not registered", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendTemplate } = require("../../lib/email")
    const result = await sendTemplate({
      to: "to@x.com",
      customerId: "cust_1",
      category: "referrals",
      template: ApplicationReceived as any,
      props: { name: "X", storeUrl: "https://x" },
      container: makeContainer({ notifModulePresent: false }),
    })
    expect(result.sent).toBe(true)
  })
})
