import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { SITE_CONFIG_MODULE } from "../../../modules/site-config"
import type SiteConfigModuleService from "../../../modules/site-config/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService
  const entries = await svc.getAll()
  res.json({ entries })
}
