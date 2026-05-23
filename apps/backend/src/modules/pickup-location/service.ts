import { MedusaService } from "@medusajs/framework/utils"
import PickupLocation from "./models/pickup-location"

class PickupLocationModuleService extends MedusaService({
  PickupLocation,
}) {
  async listActive() {
    return await (this as any).listPickupLocations(
      { is_active: true },
      { order: { sort_order: "ASC" } }
    )
  }
}

export default PickupLocationModuleService
