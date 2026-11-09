import fs from "node:fs"
import path from "node:path"
import { STORE_CART_EXTRA_ALLOWED_FIELDS } from "../../api/store/cart-allowed-fields"

const medusaRoot = path.dirname(require.resolve("@medusajs/medusa"))
const frameworkRoot = path.dirname(require.resolve("@medusajs/framework"))
const { FieldParser, AllowedFieldFilter } = require(
  path.join(frameworkRoot, "http/utils/field-filtering/index.js")
)

const storefrontData = path.resolve(__dirname, "../../../../storefront/src/lib/data")

function readConst(file: string, name: string): string {
  const src = fs.readFileSync(path.join(storefrontData, file), "utf8")
  const match = src.match(new RegExp(`const ${name}\\s*=\\s*"([^"]+)"`))
  if (!match) throw new Error(`${name} not found in ${file}`)
  return match[1]
}

function droppedFields(route: string, configName: string, fields: string, extra: string[] = []) {
  const config = require(path.join(medusaRoot, "api/store", route, "query-config.js"))[configName]
  const parsedFields = FieldParser.parse(fields.replace(/\s+/g, ""), config.defaults)
  return new AllowedFieldFilter({ allowed: [...config.allowed, ...extra] }).getNotAllowedFields({
    parsedFields,
  })
}

describe("store API allowed fields cover storefront requests", () => {
  it("keeps every cart field the storefront requests", () => {
    const fields = readConst("cart.ts", "CART_QUERY_FIELDS")
    expect(
      droppedFields(
        "carts",
        "retrieveTransformQueryConfig",
        fields,
        STORE_CART_EXTRA_ALLOWED_FIELDS
      )
    ).toEqual([])
  })

  it("requests the shipping address courier note on the cart", () => {
    expect(readConst("cart.ts", "CART_QUERY_FIELDS")).toContain("shipping_address.metadata")
  })

  it("only adds cart fields core does not already allow", () => {
    const { allowed } = require(
      path.join(medusaRoot, "api/store/carts/query-config.js")
    ).retrieveTransformQueryConfig
    expect(STORE_CART_EXTRA_ALLOWED_FIELDS.filter((f) => allowed.includes(f))).toEqual([])
  })

  it.each([
    [
      "products",
      "listProductQueryConfig",
      "*variants.calculated_price,*variants.images,+metadata,+tags",
    ],
    [
      "orders",
      "retrieveTransformQueryConfig",
      "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product,*shipping_methods",
    ],
    [
      "orders",
      "listTransformQueryConfig",
      "*items,+items.metadata,*items.variant,*items.product,+shipping_methods",
    ],
    ["customers", "retrieveTransformQueryConfig", "*orders,+addresses"],
  ])("keeps storefront fields on %s (%s)", (route, configName, fields) => {
    expect(droppedFields(route, configName, fields)).toEqual([])
  })
})
