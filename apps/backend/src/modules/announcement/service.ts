import { MedusaService } from "@medusajs/framework/utils"
import Announcement from "./models/announcement"

class AnnouncementModuleService extends MedusaService({
  Announcement,
}) {}

export default AnnouncementModuleService
