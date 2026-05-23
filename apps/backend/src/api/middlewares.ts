import {
  defineMiddlewares,
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { RegisterCustomerSchema } from "./store/customers/register/validators"
import { resolveCustomerTier } from "./store/middlewares/resolve-customer-tier"
import { publicProductRedactor } from "./store/middlewares/public-product-redactor"
import { enforceAccessOnCartAdd } from "./store/middlewares/enforce-access-on-cart-add"
import { rateLimit } from "./store/middlewares/rate-limit"
import { normalizeAdminProductResponse } from "./admin/middlewares/normalize-product-response"

export default defineMiddlewares({
  routes: [
    {
      // Defensive normaliser for admin product list/detail responses.
      // Coerces null `variants` (and similar) to [] so the admin UI's
      // ProductStatusCell doesn't crash with "undefined is not iterable"
      // when Medusa's field parser returns null for these collections.
      matcher: "/admin/products*",
      method: "GET",
      middlewares: [normalizeAdminProductResponse],
    },
    {
      matcher: "/store/customers/register",
      method: "POST",
      middlewares: [
        // Accept a registration JWT from sdk.auth.register("customer", "emailpass", ...).
        // The JWT populates req.auth_context.auth_identity_id which the workflow consumes
        // via createCustomerAccountWorkflow.runAsStep to link the new customer.
        // Use allowUnregistered:true (matches Medusa's stock /store/customers route) so
        // the middleware accepts JWTs with empty actor_id but valid auth_identity_id.
        // The route handler enforces auth_identity_id presence and returns 401 if missing.
        authenticate("customer", ["bearer"], { allowUnregistered: true }),
        validateAndTransformBody(RegisterCustomerSchema),
        rateLimit(20, 3600000),
      ],
    },
    {
      // Products and search: resolve the viewer's tier then redact if anonymous.
      // Members (any tier from approved..vip5) get untouched responses and
      // compute their countdown in the storefront. Cart-add is the authoritative
      // enforcement point for early access.
      matcher: "/store/products*",
      method: "GET",
      middlewares: [
        authenticate("customer", ["bearer", "session"], { allowUnauthenticated: true }),
        resolveCustomerTier,
        publicProductRedactor,
      ],
    },
    {
      matcher: "/store/search*",
      method: "GET",
      middlewares: [
        authenticate("customer", ["bearer", "session"], { allowUnauthenticated: true }),
        resolveCustomerTier,
        publicProductRedactor,
        rateLimit(60, 60000),
      ],
    },
    {
      // Authoritative early-access enforcement on cart-add / quantity updates.
      matcher: "/store/carts/*/line-items*",
      method: "POST",
      middlewares: [
        authenticate("customer", ["bearer", "session"], { allowUnauthenticated: true }),
        resolveCustomerTier,
        enforceAccessOnCartAdd,
      ],
    },
    {
      matcher: "/auth/customer/emailpass",
      method: "POST",
      middlewares: [rateLimit(30, 60000)],
    },
  ],
})
