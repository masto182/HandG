type HopAlertRow = {
  id: string
  customer_id: string
  hop_id: string
  channel_email: boolean
  channel_inapp: boolean
}

function makeService(seed: HopAlertRow[] = []) {
  const rows = [...seed]
  const svc: any = {}
  svc.listHopAlerts = jest.fn(async (filter: Record<string, unknown>) =>
    rows.filter((r) => Object.entries(filter).every(([k, v]) => (r as any)[k] === v))
  )
  svc.createHopAlerts = jest.fn(async (data: Partial<HopAlertRow>) => {
    const row: HopAlertRow = {
      id: `ha_${rows.length + 1}`,
      customer_id: data.customer_id!,
      hop_id: data.hop_id!,
      channel_email: data.channel_email ?? true,
      channel_inapp: data.channel_inapp ?? true,
    }
    rows.push(row)
    return row
  })
  svc.updateHopAlerts = jest.fn(async (data: any) => {
    const row = rows.find((r) => r.id === data.id)!
    Object.assign(row, data)
    return row
  })
  svc.deleteHopAlerts = jest.fn(async (id: string) => {
    const i = rows.findIndex((r) => r.id === id)
    if (i >= 0) rows.splice(i, 1)
  })
  svc._rows = rows
  return svc
}

async function upsert(
  svc: any,
  input: {
    customer_id: string
    hop_id: string
    channel_email?: boolean
    channel_inapp?: boolean
  }
) {
  const [existing] = await svc.listHopAlerts({
    customer_id: input.customer_id,
    hop_id: input.hop_id,
  })
  if (existing) {
    const next: Record<string, unknown> = { id: existing.id }
    if (typeof input.channel_email === "boolean") next.channel_email = input.channel_email
    if (typeof input.channel_inapp === "boolean") next.channel_inapp = input.channel_inapp
    let alert = existing
    if (Object.keys(next).length > 1) {
      alert = await svc.updateHopAlerts(next)
    }
    return { alert, created: false }
  }
  const alert = await svc.createHopAlerts({
    customer_id: input.customer_id,
    hop_id: input.hop_id,
    channel_email: typeof input.channel_email === "boolean" ? input.channel_email : true,
    channel_inapp: typeof input.channel_inapp === "boolean" ? input.channel_inapp : true,
  })
  return { alert, created: true }
}

describe("hop-alert upsert logic", () => {
  it("creates a new alert with channels defaulting to true", async () => {
    const svc = makeService()
    const { alert, created } = await upsert(svc, {
      customer_id: "cust_1",
      hop_id: "hop_citra",
    })
    expect(created).toBe(true)
    expect(alert.channel_email).toBe(true)
    expect(alert.channel_inapp).toBe(true)
    expect(svc.createHopAlerts).toHaveBeenCalledTimes(1)
  })

  it("creates with explicit channel flags", async () => {
    const svc = makeService()
    const { alert } = await upsert(svc, {
      customer_id: "cust_1",
      hop_id: "hop_citra",
      channel_email: false,
      channel_inapp: true,
    })
    expect(alert.channel_email).toBe(false)
    expect(alert.channel_inapp).toBe(true)
  })

  it("updates channels on an existing alert (no duplicate row)", async () => {
    const svc = makeService([
      {
        id: "ha_1",
        customer_id: "cust_1",
        hop_id: "hop_citra",
        channel_email: true,
        channel_inapp: true,
      },
    ])
    const { alert, created } = await upsert(svc, {
      customer_id: "cust_1",
      hop_id: "hop_citra",
      channel_email: false,
    })
    expect(created).toBe(false)
    expect(alert.channel_email).toBe(false)
    expect(svc.createHopAlerts).not.toHaveBeenCalled()
    expect(svc.updateHopAlerts).toHaveBeenCalledTimes(1)
    expect(svc._rows).toHaveLength(1)
  })

  it("is a no-op update when re-subscribing with no channel changes", async () => {
    const svc = makeService([
      {
        id: "ha_1",
        customer_id: "cust_1",
        hop_id: "hop_citra",
        channel_email: true,
        channel_inapp: true,
      },
    ])
    const { created } = await upsert(svc, {
      customer_id: "cust_1",
      hop_id: "hop_citra",
    })
    expect(created).toBe(false)
    expect(svc.updateHopAlerts).not.toHaveBeenCalled()
  })

  it("scopes dedupe per (customer, hop)", async () => {
    const svc = makeService([
      {
        id: "ha_1",
        customer_id: "cust_1",
        hop_id: "hop_citra",
        channel_email: true,
        channel_inapp: true,
      },
    ])
    const { created } = await upsert(svc, {
      customer_id: "cust_2",
      hop_id: "hop_citra",
    })
    expect(created).toBe(true)
    expect(svc._rows).toHaveLength(2)
  })
})
