import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { SITE_CONFIG_MODULE } from "../../../../../modules/site-config"
import type SiteConfigModuleService from "../../../../../modules/site-config/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService
  const { key } = req.params
  const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 200)

  try {
    const history = await svc.getHistory(key, limit)
    res.json({ history })
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message, code: e.code })
  }
}
