const verifyMock = jest.fn()

jest.mock("svix", () => ({
  Webhook: jest.fn().mockImplementation(() => ({
    verify: verifyMock,
  })),
}))

import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { POST } from "../../api/webhooks/resend/route"
import { EMAIL_LOG_MODULE } from "../../modules/email-log"

function makeRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

function makeReq(options?: {
  rawBody?: Buffer
  headers?: Record<string, string>
  applyWebhookEvent?: jest.Mock
  logger?: { warn: jest.Mock }
}) {
  const logger = options?.logger ?? { warn: jest.fn() }
  const emailLogService = {
    applyWebhookEvent: options?.applyWebhookEvent ?? jest.fn(),
  }

  return {
    rawBody: options?.rawBody,
    headers: options?.headers ?? {
      "svix-id": "id",
      "svix-signature": "sig",
      "svix-timestamp": "ts",
    },
    scope: {
      resolve(key: string) {
        if (key === ContainerRegistrationKeys.LOGGER) return logger
        if (key === EMAIL_LOG_MODULE) return emailLogService
        throw new Error(`unexpected dependency: ${key}`)
      },
    },
    _logger: logger,
    _emailLogService: emailLogService,
  }
}

describe("resend webhook route", () => {
  const originalSecret = process.env.RESEND_WEBHOOK_SECRET

  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SECRET = "whsec_test"
    verifyMock.mockReset()
  })

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.RESEND_WEBHOOK_SECRET
    } else {
      process.env.RESEND_WEBHOOK_SECRET = originalSecret
    }
  })

  it("returns 503 when webhook secret is missing", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET
    const req = makeReq({ rawBody: Buffer.from("{}") })
    const res = makeRes()

    await POST(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(503)
  })

  it("returns 400 when raw body is missing", async () => {
    const req = makeReq()
    const res = makeRes()

    await POST(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it("returns 401 on invalid signature", async () => {
    verifyMock.mockImplementation(() => {
      throw new Error("bad signature")
    })
    const req = makeReq({ rawBody: Buffer.from("{}") })
    const res = makeRes()

    await POST(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("returns 202 for unknown event types", async () => {
    verifyMock.mockReturnValue({ type: "email.unknown", data: { email_id: "re_123" } })
    const req = makeReq({ rawBody: Buffer.from("{}") })
    const res = makeRes()

    await POST(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(202)
    expect(req._emailLogService.applyWebhookEvent).not.toHaveBeenCalled()
  })

  it("returns 404 when no matching email log row exists", async () => {
    verifyMock.mockReturnValue({ type: "email.delivered", data: { email_id: "re_123" } })
    const applyWebhookEvent = jest.fn().mockResolvedValue(false)
    const req = makeReq({ rawBody: Buffer.from("{}"), applyWebhookEvent })
    const res = makeRes()

    await POST(req as any, res as any)

    expect(applyWebhookEvent).toHaveBeenCalledWith(
      "re_123",
      expect.objectContaining({ status: "delivered", timestampField: "delivered_at" })
    )
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it("returns 200 for a valid bounced event and forwards bounce reason", async () => {
    verifyMock.mockReturnValue({
      type: "email.bounced",
      data: { email_id: "re_123", bounce: { message: "Mailbox unavailable" } },
    })
    const applyWebhookEvent = jest.fn().mockResolvedValue(true)
    const req = makeReq({ rawBody: Buffer.from("{}"), applyWebhookEvent })
    const res = makeRes()

    await POST(req as any, res as any)

    expect(applyWebhookEvent).toHaveBeenCalledWith(
      "re_123",
      expect.objectContaining({
        status: "bounced",
        timestampField: "bounced_at",
        errorReason: "Mailbox unavailable",
      })
    )
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
