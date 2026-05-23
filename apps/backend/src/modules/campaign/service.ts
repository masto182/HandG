import { MedusaService } from "@medusajs/framework/utils"
import SpecialCampaign from "./models/campaign"
import AgingCandidate from "./models/aging-candidate"

class CampaignModuleService extends MedusaService({
  SpecialCampaign,
  AgingCandidate,
}) {
  async listActive() {
    return await (this as any).listSpecialCampaigns(
      { status: "active" },
      { order: { starts_at: "DESC" } }
    )
  }

  async listByStatus(status: string) {
    return await (this as any).listSpecialCampaigns(
      { status },
      { order: { starts_at: "DESC" } }
    )
  }

  async listPendingCandidates() {
    return await (this as any).listAgingCandidates(
      { status: "pending" },
      { order: { days_aged: "DESC" } }
    )
  }
}

export default CampaignModuleService
