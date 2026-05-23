import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { HOP_MODULE } from "../modules/hop"

export default async function hopInferenceRun(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const hopService = container.resolve(HOP_MODULE) as any
  const productModule = container.resolve(Modules.PRODUCT)
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any

  logger.info("[Hop Inference] Starting run...")

  const allHops = await hopService.listHops({ is_active: true })
  logger.info(`[Hop Inference] Loaded ${allHops.length} hops from taxonomy`)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "description", "metadata"],
  })

  const { data: existingLinks } = await query.graph({
    entity: "hop",
    fields: ["id", "product.id"],
  })

  const linkedProductIds = new Set<string>()
  for (const hop of existingLinks as any[]) {
    for (const product of hop.product || []) {
      linkedProductIds.add(`${hop.id}:${product.id}`)
    }
  }

  let autoApproved = 0
  let alreadyLinked = 0

  for (const product of products as any[]) {
    const title = (product.title || "").toLowerCase()
    const description = (product.description || "").toLowerCase()
    const combined = `${title} ${description}`

    for (const hop of allHops) {
      const hopName = hop.name.toLowerCase()
      const linkKey = `${hop.id}:${product.id}`

      if (linkedProductIds.has(linkKey)) {
        alreadyLinked++
        continue
      }

      const wordBoundaryPattern = new RegExp(`\\b${hopName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)
      if (wordBoundaryPattern.test(combined)) {
        try {
          await link.create({
            [HOP_MODULE]: { hop_id: hop.id },
            [Modules.PRODUCT]: { product_id: product.id },
          })
          linkedProductIds.add(linkKey)
          autoApproved++

          const meta = product.metadata || {}
          const currentHops: string[] = Array.isArray(meta.hops) ? meta.hops : []
          if (!currentHops.includes(hop.name)) {
            await (productModule as any).updateProducts({
              id: product.id,
              metadata: { ...meta, hops: [...currentHops, hop.name] },
            })
          }
        } catch (err: any) {
          if (!err.message?.includes("already exists") && !err.message?.includes("duplicate")) {
            logger.warn(`[Hop Inference] Failed to link ${hop.name} → ${product.id}: ${err.message}`)
          }
        }
      }
    }
  }

  logger.info(`[Hop Inference] Complete: ${autoApproved} new links created, ${alreadyLinked} already existed`)
}

export const config = {
  name: "hop-inference-run",
  schedule: "0 */6 * * *",
}
