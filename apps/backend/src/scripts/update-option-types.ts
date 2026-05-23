import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function updateOptionTypes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "type.*"],
  })

  logger.info(`Found ${options.length} options:`)
  for (const o of options as any[]) {
    logger.info(`  ${o.name} | type.code=${o.type?.code} | type.desc=${o.type?.description}`)
  }

  const updates: Record<string, string> = {
    "pickup-melb": "Tue\u2013Thu 9:30am\u20134pm. Other times via chat.",
    "pickup-hillside": "Mon & Fri 9am\u20137pm. Other times via chat.",
    "standard": "3\u20135 business days, Australia-wide",
    "express": "Next business day, Australia-wide",
  }

  for (const o of options as any[]) {
    const code = o.type?.code
    if (!code || !updates[code]) continue
    const newDesc = updates[code]
    if (o.type.description === newDesc) {
      logger.info(`  ${o.name} already up to date`)
      continue
    }
    await (fulfillmentModule as any).updateShippingOptions({
      id: o.id,
      type: { label: o.type.label, code: o.type.code, description: newDesc },
    })
    logger.info(`  Updated ${o.name}: description → "${newDesc}"`)
  }

  logger.info("Done!")
}
