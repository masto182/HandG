import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SITE_CONFIG_MODULE } from "../../../../modules/site-config"
import type SiteConfigModuleService from "../../../../modules/site-config/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService
  const config = await svc.getPublic()
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")
  res.json({ config })
}
