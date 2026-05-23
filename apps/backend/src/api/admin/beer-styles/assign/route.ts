import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BEER_STYLE_MODULE } from "../../../../modules/beer-style"
import { assignBeerStyleWorkflow } from "../../../../workflows/manage-beer-style"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { product_id, style_id } = req.body as {
    product_id: string
    style_id: string
  }

  if (!product_id || !style_id) {
    res.status(400).json({ message: "product_id and style_id are required" })
    return
  }

  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  const existingLinks = await link.list({
    [BEER_STYLE_MODULE]: { beer_style_id: style_id },
    [Modules.PRODUCT]: { product_id },
  })

  if (existingLinks.length > 0) {
    res.json({ message: "Link already exists", linked: true })
    return
  }

  await assignBeerStyleWorkflow(req.scope).run({
    input: { product_id, beer_style_id: style_id },
  })

  res.status(201).json({ linked: true, product_id, style_id })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { product_id, style_id } = req.body as {
    product_id: string
    style_id: string
  }

  if (!product_id || !style_id) {
    res.status(400).json({ message: "product_id and style_id are required" })
    return
  }

  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  await link.dismiss({
    [BEER_STYLE_MODULE]: { beer_style_id: style_id },
    [Modules.PRODUCT]: { product_id },
  })

  res.json({ unlinked: true, product_id, style_id })
}
