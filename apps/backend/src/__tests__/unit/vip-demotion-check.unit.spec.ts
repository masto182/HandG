/**
 * Tests the sendTemplate dispatch condition in vip-demotion-check.ts:
 *   sendTemplate fires ONLY when action === "warning_issued" && is_new_warning === true
 *
 * The cron handler itself is thin — this test mocks the workflow factory and
 * sendTemplate to verify the dispatch gate without requiring a real DB or Medusa container.
 */

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn(async () => ({ data: { id: "msg_test" }, error: null })) },
  })),
}))

jest.mock("../../lib/email", () => ({
  sendTemplate: jest.fn(async () => ({ sent: true })),
  refreshEmailConfig: jest.fn(async () => {}),
  getStoreUrl: jest.fn(() => "https://test.example.com"),
}))

// Mock the workflow factory — workflowRunMock is set per-test in beforeEach
jest.mock("../../workflows/evaluate-vip-demotion", () => ({
  __esModule: true,
  default: jest.fn(),
}))

import vipDemotionCheck from "../../jobs/vip-demotion-check"
import * as emailLib from "../../lib/email"
import evaluateVipDemotionWorkflow from "../../workflows/evaluate-vip-demotion"

// Typed references to the mocks after import
const sendMock = emailLib.sendTemplate as jest.Mock
const workflowFactory = evaluateVipDemotionWorkflow as unknown as jest.Mock
let workflowRunMock: jest.Mock

const VIP_SCORE_MODULE_KEY = "vipScore"

type ScoreRow = { customer_id: string; current_tier: string }

function makeContainer(scores: ScoreRow[], errLogger?: jest.Mock) {
  return {
    resolve(key: string) {
      if (key === VIP_SCORE_MODULE_KEY) {
        return { listVipScores: async () => scores }
      }
      if (key === "customer") {
        return {
          listCustomers: async ({ id }: { id: string }) => [
            { id, email: `${id}@test.example.com`, first_name: "Test" },
          ],
        }
      }
      if (key === "logger") {
        return { info: jest.fn(), error: errLogger ?? jest.fn() }
      }
      throw new Error(`unexpected resolve: ${key}`)
    },
  }
}

describe("vip-demotion-check dispatch gate", () => {
  beforeEach(() => {
    sendMock.mockClear()
    workflowRunMock = jest.fn()
    workflowFactory.mockImplementation(() => ({ run: workflowRunMock }))
  })

  it("sends warning email when action=warning_issued and is_new_warning=true", async () => {
    workflowRunMock.mockResolvedValueOnce({
      result: { action: "warning_issued", is_new_warning: true, days_remaining: 7 },
    })
    const container = makeContainer([{ customer_id: "cust_1", current_tier: "vip3" }])
    await vipDemotionCheck(container as any)
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ category: "vip_progression" }))
  })

  it("does NOT send email when action=warning_issued but is_new_warning=false (repeat warning)", async () => {
    workflowRunMock.mockResolvedValueOnce({
      result: { action: "warning_issued", is_new_warning: false, days_remaining: 5 },
    })
    const container = makeContainer([{ customer_id: "cust_1", current_tier: "vip3" }])
    await vipDemotionCheck(container as any)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("does NOT send email when action=retained", async () => {
    workflowRunMock.mockResolvedValueOnce({ result: { action: "retained" } })
    const container = makeContainer([{ customer_id: "cust_1", current_tier: "vip2" }])
    await vipDemotionCheck(container as any)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("does NOT send email when action=demoted", async () => {
    workflowRunMock.mockResolvedValueOnce({ result: { action: "demoted" } })
    const container = makeContainer([{ customer_id: "cust_1", current_tier: "vip1" }])
    await vipDemotionCheck(container as any)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("does NOT send email when action=warning_cleared", async () => {
    workflowRunMock.mockResolvedValueOnce({ result: { action: "warning_cleared" } })
    const container = makeContainer([{ customer_id: "cust_1", current_tier: "vip4" }])
    await vipDemotionCheck(container as any)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("sends only for new warnings across multiple at-risk customers", async () => {
    workflowRunMock
      .mockResolvedValueOnce({
        result: { action: "warning_issued", is_new_warning: true, days_remaining: 3 },
      })
      .mockResolvedValueOnce({ result: { action: "retained" } })
      .mockResolvedValueOnce({ result: { action: "warning_issued", is_new_warning: false } })
      .mockResolvedValueOnce({
        result: { action: "warning_issued", is_new_warning: true, days_remaining: 1 },
      })

    const container = makeContainer([
      { customer_id: "cust_1", current_tier: "vip5" },
      { customer_id: "cust_2", current_tier: "vip3" },
      { customer_id: "cust_3", current_tier: "vip2" },
      { customer_id: "cust_4", current_tier: "vip1" },
    ])
    await vipDemotionCheck(container as any)
    // cust_1 and cust_4 get emails (new warnings); cust_2 retained; cust_3 repeat warning
    expect(sendMock).toHaveBeenCalledTimes(2)
  })

  it("logs error and continues loop when sendTemplate throws", async () => {
    sendMock.mockRejectedValueOnce(new Error("Resend timeout"))
    workflowRunMock.mockResolvedValue({
      result: { action: "warning_issued", is_new_warning: true, days_remaining: 2 },
    })
    const errLogger = jest.fn()
    const container = {
      resolve(key: string) {
        if (key === VIP_SCORE_MODULE_KEY) {
          return {
            listVipScores: async () => [
              { customer_id: "cust_err", current_tier: "vip3" },
              { customer_id: "cust_ok", current_tier: "vip3" },
            ],
          }
        }
        if (key === "customer") {
          return {
            listCustomers: async ({ id }: { id: string }) => [
              { id, email: `${id}@x.com`, first_name: "X" },
            ],
          }
        }
        if (key === "logger") {
          return { info: jest.fn(), error: errLogger }
        }
        throw new Error(`unexpected: ${key}`)
      },
    }
    await expect(vipDemotionCheck(container as any)).resolves.toBeUndefined()
    // sendTemplate was called twice (both customers — first threw)
    expect(sendMock).toHaveBeenCalledTimes(2)
    expect(errLogger).toHaveBeenCalledWith(expect.stringContaining("warning email failed"))
  })

  it("skips approved and pending tier customers (not at-risk)", async () => {
    const container = makeContainer([
      { customer_id: "cust_app", current_tier: "approved" },
      { customer_id: "cust_pnd", current_tier: "pending" },
    ])
    await vipDemotionCheck(container as any)
    // workflowRun should not have been called (approved/pending are filtered out)
    expect(workflowRunMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })
})
