import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { validateReferralCodeStep } from "../../src/workflows/steps/validate-referral-code"
import { generateReferralCodeStep } from "../../src/workflows/steps/generate-referral-code"
import { createReferralStep } from "../../src/workflows/steps/create-referral"

jest.setTimeout(120_000)

// Thin wrapper workflows so the steps can be exercised directly in tests.
const runValidate = createWorkflow("test-run-validate-referral", function (input: any) {
  return new WorkflowResponse(validateReferralCodeStep(input))
})
const runGenerate = createWorkflow("test-run-generate-referral", function (input: any) {
  return new WorkflowResponse(generateReferralCodeStep(input))
})
const runCreateReferral = createWorkflow("test-run-create-referral", function (input: any) {
  return new WorkflowResponse(createReferralStep(input))
})

medusaIntegrationTestRunner({
  disableAutoTeardown: true,
  testSuite: ({ getContainer }) => {
    describe("referral H7/H4/self-ref/unique", () => {
      it("resolves a referral code to a customer via the indexed table (H7)", async () => {
        const container = getContainer()
        const referral = container.resolve("referral") as any
        await referral.createReferralCodes({ customer_id: "ref_owner_1", code: "INDEXED1" })

        const { result: hit } = await runValidate(container).run({
          input: { referral_code: "INDEXED1" },
        })
        expect(hit.referrer_customer_id).toBe("ref_owner_1")

        const { result: miss } = await runValidate(container).run({
          input: { referral_code: "NOPE-NOPE" },
        })
        expect(miss.referrer_customer_id).toBeNull()
      })

      it("generate persists an indexed referral_code row + customer metadata (H7)", async () => {
        const container = getContainer()
        const referral = container.resolve("referral") as any
        const customerModule = container.resolve("customer") as any
        const [cust] = await customerModule.createCustomers([
          { email: "gen-ref@test.dev", first_name: "Gen" },
        ])

        const { result } = await runGenerate(container).run({
          input: { customer_id: cust.id },
        })
        expect(result.referral_code).toMatch(/^[0-9A-F]{8}$/)

        const [row] = await referral.listReferralCodes({ customer_id: cust.id })
        expect(row.code).toBe(result.referral_code)
        const [reread] = await customerModule.listCustomers({ id: cust.id })
        expect((reread.metadata as any).referral_code).toBe(result.referral_code)
      })

      it("enforces a unique referred_customer_id (dedupe-first migration)", async () => {
        const container = getContainer()
        const referral = container.resolve("referral") as any
        await referral.createReferrals({
          referrer_customer_id: "r_a",
          referred_customer_id: "referred_unique",
          referral_code: "X",
        })
        await expect(
          referral.createReferrals({
            referrer_customer_id: "r_b",
            referred_customer_id: "referred_unique",
            referral_code: "Y",
          })
        ).rejects.toBeDefined()
      })

      it("does not create a self-referral", async () => {
        const container = getContainer()
        const referral = container.resolve("referral") as any

        const { result } = await runCreateReferral(container).run({
          input: {
            referrer_customer_id: "same_person",
            referred_customer_id: "same_person",
            referral_code: "SELF",
          },
        })
        expect(result).toBeNull()
        const rows = await referral.listReferrals({ referred_customer_id: "same_person" })
        expect(rows.length).toBe(0)
      })
    })
  },
})
