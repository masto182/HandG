import { z } from "zod"
import { STORE_EVENT_TYPES } from "../../../modules/analytics/lib/storefront-event-types"

const MAX_PAYLOAD_BYTES = 4096

const boundedString = (max: number) => z.string().trim().min(1).max(max)
const optionalBoundedString = (max: number) => boundedString(max).optional()
const boundedNullableString = (max: number) => boundedString(max).nullable().optional()
const boundedNumber = z.number().finite().min(0).max(1_000_000_000)
const sessionIdSchema = z.string().uuid()
const cartIdSchema = boundedString(64)
const orderIdSchema = boundedString(64)
const productIdSchema = boundedString(64)
const variantIdSchema = boundedString(64)

const filtersSchema = z
  .object({
    brewery: optionalBoundedString(512),
    style: optionalBoundedString(256),
    freshness: optionalBoundedString(64),
    hops: optionalBoundedString(512),
    hop_country: optionalBoundedString(32),
    abv: optionalBoundedString(32),
    tags: optionalBoundedString(128),
    hopsMode: z.enum(["and", "or"]).optional(),
    collab: z.enum(["true", "false"]).optional(),
    on_sale: z.enum(["true", "false"]).optional(),
    available: z.enum(["true", "false"]).optional(),
  })
  .strict()

const baseEventSchema = z.object({
  session_id: sessionIdSchema,
})

export const StoreEventRequestSchema = z
  .discriminatedUnion("event_type", [
    baseEventSchema.extend({
      event_type: z.literal("product.viewed"),
      payload: z
        .object({
          product_id: productIdSchema,
          handle: optionalBoundedString(160),
          brewery_slug: optionalBoundedString(160),
          untappd_rating: z.union([boundedNumber, boundedNullableString(16)]).optional(),
        })
        .strict(),
    }),
    baseEventSchema.extend({
      event_type: z.literal("brewery.viewed"),
      payload: z
        .object({
          slug: boundedString(160),
          name: optionalBoundedString(160),
        })
        .strict(),
    }),
    baseEventSchema.extend({
      event_type: z.literal("filter.applied"),
      payload: z
        .object({
          filters: filtersSchema,
        })
        .strict(),
    }),
    baseEventSchema.extend({
      event_type: z.literal("cart.viewed"),
      payload: z
        .object({
          cart_id: cartIdSchema,
          item_count: z.number().int().min(0).max(500).optional(),
        })
        .strict(),
    }),
    baseEventSchema.extend({
      event_type: z.literal("cart.item_added"),
      payload: z
        .object({
          variant_id: variantIdSchema,
          product_id: productIdSchema.optional(),
        })
        .strict(),
    }),
    baseEventSchema.extend({
      event_type: z.literal("checkout.step_reached"),
      payload: z
        .object({
          cart_id: cartIdSchema,
          step: z.enum(["fulfilment", "address", "shipping", "payment", "review"]),
        })
        .strict(),
    }),
    baseEventSchema.extend({
      event_type: z.literal("checkout.address_submitted"),
      payload: z
        .object({
          cart_id: cartIdSchema,
        })
        .strict(),
    }),
    baseEventSchema.extend({
      event_type: z.literal("checkout.fulfilment_selected"),
      payload: z
        .object({
          cart_id: cartIdSchema,
          method: z.enum(["pickup", "delivery"]),
          pickup_option_id: optionalBoundedString(64),
          pickup_location_name: optionalBoundedString(160),
        })
        .strict()
        .superRefine((payload, ctx) => {
          if (payload.method === "pickup" && !payload.pickup_option_id) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "pickup_option_id required for pickup fulfilment",
              path: ["pickup_option_id"],
            })
          }
        }),
    }),
    baseEventSchema.extend({
      event_type: z.literal("checkout.shipping_method_selected"),
      payload: z
        .object({
          cart_id: cartIdSchema,
          rate_id: boundedString(128),
          rate_name: optionalBoundedString(160),
          provider_id: optionalBoundedString(64),
          amount: boundedNumber.optional(),
        })
        .strict(),
    }),
    baseEventSchema.extend({
      event_type: z.literal("order.confirmation_viewed"),
      payload: z
        .object({
          order_id: orderIdSchema,
          cart_id: cartIdSchema.optional(),
          total: boundedNumber.optional(),
          currency_code: z
            .string()
            .trim()
            .regex(/^[a-zA-Z]{3}$/)
            .optional(),
        })
        .strict(),
    }),
  ])
  .superRefine((value, ctx) => {
    const payloadBytes = Buffer.byteLength(JSON.stringify(value.payload ?? {}), "utf8")
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `payload exceeds ${MAX_PAYLOAD_BYTES} bytes`,
        path: ["payload"],
      })
    }
  })

export type StoreEventRequest = z.infer<typeof StoreEventRequestSchema>

export const storeEventTypes = [...STORE_EVENT_TYPES]
