import { defineMiddlewares, authenticate } from "@medusajs/framework/http"
import { validateBody } from "../lib/validate-body"
import { RegisterCustomerSchema } from "./store/customers/register/validators"
import { resolveCustomerTier } from "./store/middlewares/resolve-customer-tier"
import { publicProductRedactor } from "./store/middlewares/public-product-redactor"
import { enforceAccessOnCartAdd } from "./store/middlewares/enforce-access-on-cart-add"
import { rateLimit } from "./store/middlewares/rate-limit"
import { normalizeAuthEmail } from "./store/middlewares/normalize-auth-email"
import { normalizeAdminProductResponse } from "./admin/middlewares/normalize-product-response"
import { productImageMiddlewares } from "./admin/product-images/validators"
import { StoreEventRequestSchema } from "./store/events/validators"
import { SessionHeartbeatRequestSchema } from "./store/sessions/heartbeat/validators"

export default defineMiddlewares({
  routes: [
    ...productImageMiddlewares,
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
        validateBody(RegisterCustomerSchema),
        rateLimit(process.env.NODE_ENV === "production" ? 20 : 200, 3600000),
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
      // Auth middleware for the analytics ingest endpoint so logged-in members
      // get customer_id attributed to their events (drives per-member drill-down).
      // allowUnauthenticated keeps anonymous browsing events flowing too.
      matcher: "/store/events",
      method: "POST",
      middlewares: [
        authenticate("customer", ["bearer", "session"], { allowUnauthenticated: true }),
        validateBody(StoreEventRequestSchema),
        rateLimit(process.env.NODE_ENV === "production" ? 120 : 1200, 60000),
      ],
    },
    {
      // Session heartbeat — fires far more frequently than /store/events, so
      // it gets a more generous rate limit ceiling.
      matcher: "/store/sessions/heartbeat",
      method: "POST",
      middlewares: [
        authenticate("customer", ["bearer", "session"], { allowUnauthenticated: true }),
        validateBody(SessionHeartbeatRequestSchema),
        rateLimit(process.env.NODE_ENV === "production" ? 240 : 2400, 60000),
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
      // Restock alert subscribe/list/unsubscribe requires a logged-in customer;
      // route handlers read req.auth_context.actor_id unconditionally.
      matcher: "/store/customers/me/restock-alerts*",
      method: ["GET", "POST", "DELETE"],
      middlewares: [authenticate("customer", ["bearer", "session"])],
    },
    {
      matcher: "/auth/customer/emailpass",
      method: "POST",
      middlewares: [normalizeAuthEmail, rateLimit(30, 60000)],
    },
    {
      // Identity creation during /apply. Normalise here too so the stored
      // entity_id is lowercase from the start.
      matcher: "/auth/customer/emailpass/register",
      method: "POST",
      middlewares: [normalizeAuthEmail],
    },
  ],
})
