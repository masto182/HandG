import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createPriceListsWorkflow } from "@medusajs/medusa/core-flows"
import { CAMPAIGN_MODULE } from "../modules/campaign"

type ActivateCampaignInput = { id: string }
type ExpireCampaignInput = { id: string }
type ApproveAgingInput = {
  candidate_id: string
  discount_type: "percentage" | "fixed"
  discount_value: number
}

const activateCampaignStep = createStep(
  "activate-campaign-step",
  async (input: ActivateCampaignInput, { container }) => {
    const campaignService = container.resolve(CAMPAIGN_MODULE) as any
    const query = container.resolve(ContainerRegistrationKeys.QUERY) as any

    const campaign = await campaignService.retrieveSpecialCampaign(input.id)
    if (campaign.status === "active") {
      return new StepResponse(campaign, null)
    }

    const productIds: string[] = campaign.target_product_ids || []
    if (!productIds.length) {
      throw new Error("Campaign has no target products")
    }

    const { data: products } = await query.graph({
      entity: "product",
      filters: { id: productIds },
      fields: ["id", "variants.id", "variants.prices.*"],
    })

    const prices: Array<{ variant_id: string; currency_code: string; amount: number }> = []
    for (const product of products) {
      for (const variant of product.variants || []) {
        const audPrice = (variant.prices || []).find((p: any) => p.currency_code === "aud")
        if (!audPrice) continue

        let newAmount: number
        if (campaign.discount_type === "percentage") {
          newAmount = audPrice.amount * (1 - campaign.discount_value / 100)
        } else {
          newAmount = Math.max(0, audPrice.amount - campaign.discount_value)
        }

        prices.push({
          variant_id: variant.id,
          currency_code: "aud",
          amount: Math.round(newAmount * 100) / 100,
        })
      }
    }

    if (!prices.length) {
      throw new Error("No AUD-priced variants found for campaign products")
    }

    const priceListInput: any = {
      title: campaign.title,
      description: campaign.description || `Campaign: ${campaign.title}`,
      type: "sale",
      status: "active",
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at || undefined,
      prices,
    }

    const customerGroups: string[] = campaign.target_customer_groups || []
    if (customerGroups.length > 0) {
      priceListInput.rules = { customer_group_id: customerGroups }
    }

    const { result: priceLists } = await createPriceListsWorkflow(container).run({
      input: { price_lists_data: [priceListInput] },
    })

    const priceListId = priceLists?.[0]?.id || null

    await campaignService.updateSpecialCampaigns({
      selector: { id: campaign.id },
      data: { status: "active", price_list_id: priceListId },
    })

    const updated = await campaignService.retrieveSpecialCampaign(campaign.id)
    return new StepResponse(updated, { campaign_id: campaign.id, price_list_id: priceListId, prev_status: campaign.status })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const campaignService = container.resolve(CAMPAIGN_MODULE) as any
    const pricingModule = container.resolve(Modules.PRICING) as any

    if (compensation.price_list_id) {
      try {
        await pricingModule.deletePriceLists([compensation.price_list_id])
      } catch {}
    }
    await campaignService.updateSpecialCampaigns({
      selector: { id: compensation.campaign_id },
      data: { status: compensation.prev_status, price_list_id: null },
    })
  }
)

const expireCampaignStep = createStep(
  "expire-campaign-step",
  async (input: ExpireCampaignInput, { container }) => {
    const campaignService = container.resolve(CAMPAIGN_MODULE) as any
    const pricingModule = container.resolve(Modules.PRICING) as any

    const campaign = await campaignService.retrieveSpecialCampaign(input.id)
    if (campaign.status === "expired") {
      return new StepResponse(campaign, null)
    }

    if (campaign.price_list_id) {
      try {
        await pricingModule.deletePriceLists([campaign.price_list_id])
      } catch {}
    }

    await campaignService.updateSpecialCampaigns({
      selector: { id: campaign.id },
      data: { status: "expired", price_list_id: null },
    })

    const updated = await campaignService.retrieveSpecialCampaign(campaign.id)
    return new StepResponse(updated, { campaign_id: campaign.id, prev_status: campaign.status, prev_price_list_id: campaign.price_list_id })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const campaignService = container.resolve(CAMPAIGN_MODULE) as any
    await campaignService.updateSpecialCampaigns({
      selector: { id: compensation.campaign_id },
      data: { status: compensation.prev_status, price_list_id: compensation.prev_price_list_id },
    })
  }
)

const approveAgingStep = createStep(
  "approve-aging-step",
  async (input: ApproveAgingInput, { container }) => {
    const campaignService = container.resolve(CAMPAIGN_MODULE) as any
    const productModule = container.resolve(Modules.PRODUCT) as any

    const candidate = await campaignService.retrieveAgingCandidate(input.candidate_id)
    if (candidate.status !== "pending") {
      throw new Error("Candidate is not pending")
    }

    let productTitle = candidate.product_title || "Unknown"
    try {
      const product = await productModule.retrieveProduct(candidate.product_id)
      productTitle = product.title || productTitle
    } catch {}

    const slug = `aging-${candidate.product_id}-${Date.now()}`
    const campaign = await campaignService.createSpecialCampaigns({
      title: `Aging Markdown: ${productTitle}`,
      slug,
      type: "aging_markdown",
      starts_at: new Date(),
      ends_at: null,
      target_product_ids: [candidate.product_id],
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      status: "scheduled",
    })

    await campaignService.updateAgingCandidates({
      selector: { id: candidate.id },
      data: { status: "approved", campaign_id: campaign.id },
    })

    return new StepResponse(
      { campaign, candidate },
      { candidate_id: candidate.id, campaign_id: campaign.id }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const campaignService = container.resolve(CAMPAIGN_MODULE) as any
    await campaignService.updateAgingCandidates({
      selector: { id: compensation.candidate_id },
      data: { status: "pending", campaign_id: null },
    })
    try {
      await campaignService.deleteSpecialCampaigns([compensation.campaign_id])
    } catch {}
  }
)

export const activateCampaignWorkflow = createWorkflow(
  "activate-campaign",
  function (input: ActivateCampaignInput) {
    const result = (activateCampaignStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const expireCampaignWorkflow = createWorkflow(
  "expire-campaign",
  function (input: ExpireCampaignInput) {
    const result = (expireCampaignStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const approveAgingWorkflow = createWorkflow(
  "approve-aging-candidate",
  function (input: ApproveAgingInput) {
    const result = (approveAgingStep as any)(input)
    return new WorkflowResponse(result)
  }
)
