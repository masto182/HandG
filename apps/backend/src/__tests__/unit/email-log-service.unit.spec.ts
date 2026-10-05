import EmailLogModuleService from "../../modules/email-log/service"

describe("EmailLogModuleService.applyWebhookEvent", () => {
  it("does not regress positive status and still records bounce reason", async () => {
    const listEmailLogs = jest.fn().mockResolvedValue([
      {
        id: "elog_1",
        status: "clicked",
        open_count: 2,
        click_count: 1,
        raw_events: [],
      },
    ])
    const updateEmailLogs = jest.fn().mockResolvedValue(undefined)

    const service = new EmailLogModuleService({ __pg_connection__: null } as any)
    ;(service as any).listEmailLogs = listEmailLogs
    ;(service as any).updateEmailLogs = updateEmailLogs

    const applied = await service.applyWebhookEvent("re_123", {
      status: "opened",
      timestampField: "opened_at",
      incrementOpen: true,
      rawEvent: { type: "email.opened" },
    })

    expect(applied).toBe(true)
    expect(updateEmailLogs).toHaveBeenCalledWith({
      selector: { id: "elog_1" },
      data: expect.objectContaining({
        status: "clicked",
        opened_at: expect.any(Date),
        open_count: 3,
      }),
    })
  })

  it("lets bounced override positive status and stores error reason", async () => {
    const updateEmailLogs = jest.fn().mockResolvedValue(undefined)

    const service = new EmailLogModuleService({ __pg_connection__: null } as any)
    ;(service as any).listEmailLogs = jest.fn().mockResolvedValue([
      {
        id: "elog_2",
        status: "delivered",
        open_count: 0,
        click_count: 0,
        raw_events: [],
      },
    ])
    ;(service as any).updateEmailLogs = updateEmailLogs

    await service.applyWebhookEvent("re_123", {
      status: "bounced",
      timestampField: "bounced_at",
      errorReason: "Mailbox unavailable",
      rawEvent: { type: "email.bounced" },
    })

    expect(updateEmailLogs).toHaveBeenCalledWith({
      selector: { id: "elog_2" },
      data: expect.objectContaining({
        status: "bounced",
        bounced_at: expect.any(Date),
        error_reason: "Mailbox unavailable",
      }),
    })
  })
})
