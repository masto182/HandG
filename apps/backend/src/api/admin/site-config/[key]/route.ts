import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { SITE_CONFIG_MODULE } from "../../../../modules/site-config"
import type SiteConfigModuleService from "../../../../modules/site-config/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService
  const { key } = req.params
  try {
    const entry = await svc.getEffectiveWithSource(key)
    res.json({ entry })
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message, code: e.code })
  }
}

export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService
  const { key } = req.params
  const body = req.body as { value: unknown }
  const actor = (req as any).auth_context?.actor_id ?? null

  if (body === undefined || body === null || !("value" in body)) {
    return res.status(400).json({ message: "Body must include `value`" })
  }

  try {
    const entry = await svc.set(key, body.value, actor ?? undefined)
    res.json({ entry })
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message, code: e.code })
  }
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService
  const { key } = req.params
  const actor = (req as any).auth_context?.actor_id ?? null

  try {
    const entry = await svc.unset(key, actor ?? undefined)
    res.json({ entry })
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message, code: e.code })
  }
}
