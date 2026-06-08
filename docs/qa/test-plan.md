# Hops & Glory QA Test Plan

**Version:** 1.0  
**Date:** 2026-06-08  
**Author:** QA (generated from codebase inventory + sprint history)  
**Stack:** Medusa v2 (:9000 backend) · Next.js 15 (:8000 storefront) · PayID payment provider  
**Test framework:** Playwright (workers:1, fullyParallel:false)

---

## Roles reference

| Handle        | Description                                                          |
| ------------- | -------------------------------------------------------------------- |
| `guest`       | Unauthenticated visitor                                              |
| `pending`     | Registered, not yet approved                                         |
| `rejected`    | Application rejected                                                 |
| `member`      | Approved, in "approved" group; `canSeePricing=true`                  |
| `vip1`–`vip5` | VIP tier members; also `canSeePricing=true`; tier gates early access |
| `admin`       | Medusa admin user at `/app`                                          |

---

## Hypothesis tags (known risks)

| Tag                     | Description                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| H-AUTH-DISABLE          | `setAuthIdentityDisabledStep` writes to non-existent column — suspend/reject does NOT block login |
| H-APPROVE-NO-CONFIRM    | Approve member action fires immediately with no confirm dialog                                    |
| H-REACTIVATE-NO-CONFIRM | Reactivate action explicitly skips confirm prompt                                                 |
| H-HEAT-HOLD-NO-CONFIRM  | Heat-hold toggle has no confirm dialog                                                            |
| H-BUY-AT-PRICE-ZERO     | `offer_price=0` passes server-side null check — $0 purchase is possible                           |
| H-MOBILE-NAV-GUEST      | Cart + Account tabs visible to guest on mobile bottom nav (inconsistency)                         |
| H-TRUSTBAR-DEAD         | TrustBar component defined but never imported in page.tsx                                         |
| H-CHEVRONS-DEAD         | New Arrivals prev/next chevrons have no scroll handler                                            |
| H-UNTAPPD-DEAD          | `untappd_id` field collected but no input rendered on apply form                                  |
| H-ACCOUNT-SUBPAGE-GUEST | `/account/vip`, `/account/wishlist`, `/account/referrals` have no auth guard in route file        |

---

## T-GUEST: Guest (unauthenticated) tests

---

### T-GUEST-001

**Title:** Homepage renders without crash — all major sections present  
**Role:** guest  
**URL/Component:** `/`  
**Steps:**

1. Open `http://localhost:8000/` in a clean browser context (no cookies).
2. Wait for `<main>` to be visible.
3. Check for Hero section (`data-testid="hero"` or `h1` with site name).
4. Check for New Arrivals section heading.
5. Check for Featured Producers section heading.
6. Scroll to footer — check footer links render.
   **Expected:** Page loads with 200, no console errors, Hero / New Arrivals / Featured Producers visible, footer present.  
   **Severity if failed:** Critical

---

### T-GUEST-002

**Title:** TrustBar is NOT rendered (confirmed dead component)  
**Role:** guest  
**URL/Component:** `/`  
**Steps:**

1. Open `/`.
2. Query DOM for the TrustBar component root: `document.querySelector('[data-testid="trust-bar"]')` or a text search for the known trust-bar copy strings.
3. Also check React DevTools component tree for `TrustBar` mount.
   **Expected:** TrustBar element is absent from DOM. It is intentionally not imported in `page.tsx`. Absence is the expected state, not a regression.  
   **Severity if failed:** Low (cosmetic — verifying expected absence)  
   **[H-TRUSTBAR-DEAD]**

---

### T-GUEST-003

**Title:** New Arrivals chevrons do not scroll rail (dead code)  
**Role:** guest  
**URL/Component:** `/` — New Arrivals horizontal scroll rail  
**Steps:**

1. Open `/`.
2. Locate the New Arrivals rail with Prev `<` and Next `>` chevron buttons.
3. Click Next `>`.
4. Observe scroll position of rail.
5. Click Prev `<`.
6. Observe scroll position of rail.
   **Expected:** Rail does NOT scroll in either direction. No console error. Buttons render but do nothing. This is known dead code — clicking them silently does nothing.  
   **Severity if failed:** Medium (UX regression — buttons appear functional but are not)  
   **[H-CHEVRONS-DEAD]**

---

### T-GUEST-004

**Title:** Product cards show no price, no ABV, and Members Only overlay  
**Role:** guest  
**URL/Component:** `/store`  
**Steps:**

1. Open `/store`.
2. Wait for product grid to load.
3. For each visible product card:
   a. Confirm no price string (e.g., no `$XX.XX`) is visible.
   b. Confirm no ABV percentage is visible.
   c. Confirm a lock icon and/or "Members Only" text overlay is present.
4. Confirm no "Add to Cart" button is visible.
   **Expected:** Prices and ABV are fully hidden. Each card shows a Members-only gate. No add-to-cart affordance.  
   **Severity if failed:** Critical

---

### T-GUEST-005

**Title:** Store counter shows "X releases found" not "beers found"  
**Role:** guest  
**URL/Component:** `/store`  
**Steps:**

1. Open `/store`.
2. Wait for product count text to appear.
3. Read the counter text.
   **Expected:** Counter reads `{N} releases found`. The word "releases" is used for guests; "beers" is reserved for approved members.  
   **Severity if failed:** High

---

### T-GUEST-006

**Title:** Sort control is hidden for guest  
**Role:** guest  
**URL/Component:** `/store`  
**Steps:**

1. Open `/store`.
2. Inspect the filter/sort toolbar area.
3. Confirm no sort dropdown or sort button is present in the DOM or is `display:none`.
   **Expected:** Sort control absent. Guests cannot sort products.  
   **Severity if failed:** High

---

### T-GUEST-007

**Title:** Style filter is hidden for guest  
**Role:** guest  
**URL/Component:** `/store`  
**Steps:**

1. Open `/store`.
2. Inspect filter controls.
3. Confirm no "Style" filter option is visible or interactive.
   **Expected:** Style filter absent for guests. (Sale filter should also be absent — verify while in this area.)  
   **Severity if failed:** High

---

### T-GUEST-008

**Title:** Apply form renders all required fields  
**Role:** guest  
**URL/Component:** `/apply`  
**Steps:**

1. Open `/apply`.
2. Confirm the following fields are present and labelled:
   - First name (required)
   - Last name (required)
   - Email (required)
   - Password (required)
   - Date of birth (required)
   - Why join (textarea, required)
   - Favourite brewery (required)
   - Referral code (optional — field present but not required)
3. Confirm `untappd_id` has NO visible input rendered (dead field — collected elsewhere or omitted).
4. Confirm a Submit / Apply button is present.
   **Expected:** All 7 active fields render. `untappd_id` has no visible form input. Submit CTA present.  
   **Severity if failed:** Critical  
   **[H-UNTAPPD-DEAD]**

---

### T-GUEST-009

**Title:** Apply form rejects date of birth under 18  
**Role:** guest  
**URL/Component:** `/apply`  
**Steps:**

1. Open `/apply`.
2. Fill all required fields with valid data.
3. For date_of_birth, enter a date exactly 17 years and 364 days ago (one day short of 18).
4. Submit the form.
   **Expected:** Server-side age validation (`validate-age.ts` step) returns an error. Form stays on `/apply`. An age-related error message is displayed (e.g., "You must be 18 or older").  
   **Severity if failed:** Critical (legal compliance)

---

### T-GUEST-010

**Title:** Apply form referral code format validation  
**Role:** guest  
**URL/Component:** `/apply`  
**Steps:**

1. Open `/apply` and fill required fields.
2. Enter referral code `abc` (too short — below 4 chars).
3. Submit. Confirm error for code too short.
4. Enter `AB$CD` (invalid character). Submit. Confirm error for invalid chars.
5. Enter a valid code `ABCD-1234`. Confirm no validation error.
6. Leave referral code blank. Submit a valid form. Confirm blank is accepted (field is optional).
   **Expected:** Codes shorter than 4 chars and codes with non-`[A-Z0-9-]` characters are rejected with a validation message. Valid format and blank both pass.  
   **Severity if failed:** Medium

---

### T-GUEST-011

**Title:** Apply form rejects why_join over 2000 characters  
**Role:** guest  
**URL/Component:** `/apply`  
**Steps:**

1. Open `/apply`.
2. Fill all required fields.
3. Paste 2001 characters into the `why_join` textarea.
4. Submit.
   **Expected:** Validation error indicating the field exceeds 2000 characters. Form does not submit.  
   **Severity if failed:** Medium

---

### T-GUEST-012

**Title:** Apply form strips HTML injection from why_join  
**Role:** guest  
**URL/Component:** `/apply`  
**Steps:**

1. Open `/apply`.
2. Fill required fields.
3. Enter `<script>alert(1)</script>I love craft beer` in why_join.
4. Submit (use a valid DOB ≥18, valid password, etc.).
5. After submission (or upon error), inspect what was persisted: either check the server-side customer record via admin API (`/admin/customers/{id}`) or inspect the pending application in the admin UI.
   **Expected:** `safeText` strips the `<script>...</script>` tag. Stored value is `I love craft beer` or similar clean text. No script tag in the DB. No XSS alert fires.  
   **Severity if failed:** Critical (XSS / injection risk)

---

### T-GUEST-013

**Title:** /cart as guest redirects to / with no error message (UX gap)  
**Role:** guest  
**URL/Component:** `/cart`  
**Steps:**

1. Ensure no session cookie is set.
2. Navigate directly to `/cart`.
3. Observe destination URL.
4. Observe any visible error or explanatory message.
   **Expected:** Redirected to `/`. No cart-related error message is displayed. This is a known UX gap — guest simply lands on home with no explanation. Document whether a toast or inline message appears (it should not currently).  
   **Severity if failed:** Low (UX gap is known; test verifies behavior hasn't changed unexpectedly)

---

### T-GUEST-014

**Title:** /checkout as guest redirects to / with no error message (UX gap)  
**Role:** guest  
**URL/Component:** `/checkout`  
**Steps:**

1. Ensure no session cookie is set.
2. Navigate directly to `/checkout`.
3. Observe destination URL and any message.
   **Expected:** Redirected to `/`. No checkout-related error message displayed. Known UX gap — same behavior as cart redirect.  
   **Severity if failed:** Low (known gap)

---

### T-GUEST-015

**Title:** /account as guest shows login form, not 404  
**Role:** guest  
**URL/Component:** `/account`  
**Steps:**

1. Open `/account` with no session.
2. Observe which parallel slot renders.
   **Expected:** `@login` slot is rendered, showing a login form. The page does NOT return 404 or crash. URL stays `/account`.  
   **Severity if failed:** Critical

---

### T-GUEST-016

**Title:** /account/vip as guest — verify behavior (no route guard confirmed)  
**Role:** guest  
**URL/Component:** `/account/vip`  
**Steps:**

1. Open `/account/vip` with no session.
2. Observe: does the page render, show empty state, redirect, or return 404?
3. If rendered, check whether any customer-specific data is shown.
   **Expected (hypothesis):** Route has no explicit auth guard in the file. Page likely renders an empty state or calls `notFound()` due to missing customer object. Document actual behavior.  
   **Severity if failed:** High if customer data leaks; Medium if blank render  
   **[H-ACCOUNT-SUBPAGE-GUEST]**

---

### T-GUEST-017

**Title:** /account/wishlist as guest — verify behavior  
**Role:** guest  
**URL/Component:** `/account/wishlist`  
**Steps:**

1. Open `/account/wishlist` with no session.
2. Observe behavior: render, empty, redirect, or 404.
   **Expected (hypothesis):** Same as T-GUEST-016. No auth guard in route file. Document result.  
   **Severity if failed:** High if wishlist data visible; Medium otherwise  
   **[H-ACCOUNT-SUBPAGE-GUEST]**

---

### T-GUEST-018

**Title:** /account/referrals as guest — verify behavior  
**Role:** guest  
**URL/Component:** `/account/referrals`  
**Steps:**

1. Open `/account/referrals` with no session.
2. Observe behavior.
   **Expected (hypothesis):** No auth guard in route file. Likely renders empty or 404 via `notFound()`. Document actual behavior. Referral code must not be exposed.  
   **Severity if failed:** Critical if referral code shown; Medium if blank  
   **[H-ACCOUNT-SUBPAGE-GUEST]**

---

### T-GUEST-019

**Title:** Mobile bottom nav shows Cart + Account tabs for guest (inconsistency)  
**Role:** guest  
**URL/Component:** Any page at 390px viewport  
**Steps:**

1. Set viewport to 390×844 (iPhone 14).
2. Open `/`.
3. Inspect the bottom navigation bar.
4. Count and identify all tabs. Confirm: Collection, Breweries/Producers, Hops, Cart, Account all visible.
5. Tap the Cart tab. Observe: does it navigate or redirect?
6. Tap the Account tab. Observe: login form or redirect?
   **Expected:** All 5 tabs visible regardless of auth state. Cart tab is visible to guest even though desktop nav hides it. This is a known inconsistency — document actual behavior for both tabs.  
   **Severity if failed:** Medium (UX inconsistency — not a security issue)  
   **[H-MOBILE-NAV-GUEST]**

---

### T-GUEST-020

**Title:** Breweries page loads and labels producers "Producers" for guest  
**Role:** guest  
**URL/Component:** `/breweries`  
**Steps:**

1. Open `/breweries`.
2. Confirm page loads without error.
3. Check section heading and any label text — confirm "Producers" not "Breweries".
4. Open `/breweries/tree-house` (or any valid slug).
5. Confirm individual brewery page loads.
   **Expected:** Page loads. Heading/label reads "Producers" for unauthenticated users. Individual brewery detail page also loads.  
   **Severity if failed:** Medium

---

### T-GUEST-021

**Title:** PDP shows no price, no Add to Cart, shows Apply CTA  
**Role:** guest  
**URL/Component:** `/products/[handle]` — any available product  
**Steps:**

1. Open a known product PDP (e.g., `/products/tree-house-juice`).
2. Confirm no price is displayed.
3. Confirm no "Add to Cart" button or quantity stepper is visible.
4. Confirm an Apply CTA (e.g., "Apply for membership" or "Apply now") is visible.
5. Confirm no wishlist panel is visible.
   **Expected:** Price hidden, cart CTA hidden, Apply CTA shown, wishlist panel absent.  
   **Severity if failed:** Critical

---

### T-GUEST-022

**Title:** PDP for pending user shows "Application Pending" blocker  
**Role:** pending  
**URL/Component:** `/products/[handle]`  
**Steps:**

1. Authenticate as a pending (not yet approved) member.
2. Open any product PDP.
3. Observe the area where Apply CTA or Add to Cart would appear.
   **Expected:** "Application Pending" badge or message shown. No Add to Cart. No Apply CTA (they already applied). Application status clearly communicated.  
   **Severity if failed:** High

---

### T-GUEST-023

**Title:** Hops list loads and country filter tabs function  
**Role:** guest  
**URL/Component:** `/hops`  
**Steps:**

1. Open `/hops`.
2. Confirm hop cards render.
3. Click a country filter tab (e.g., "USA", "Australia", "New Zealand").
4. Confirm the hop list filters to the selected country.
5. Click "All" or clear filter — confirm full list restores.
   **Expected:** Hop list renders for guests. Country filter tabs work. Filtering produces correct subset.  
   **Severity if failed:** Medium

---

### T-GUEST-024

**Title:** Hop detail page shows country badge, breeder, form chips, farm notes  
**Role:** guest  
**URL/Component:** `/hops/[slug]`  
**Steps:**

1. Open a known hop detail page (e.g., `/hops/citra`).
2. Confirm country badge is visible (e.g., "USA").
3. Confirm breeder/origin field is shown.
4. Confirm flavour/form chips are rendered (e.g., pellet, cone).
5. Confirm farm notes or description text is present.
   **Expected:** All four data groups render on the hop detail page.  
   **Severity if failed:** Low

---

### T-GUEST-025

**Title:** API: GET /store/products count field vs visible count parity  
**Role:** guest (API)  
**URL/Component:** `GET /store/products` (Medusa Store API)  
**Steps:**

1. Call `GET http://localhost:9000/store/products?limit=100` with a valid publishable key header.
2. Note the `count` field in the response.
3. Note the number of product objects in the `products` array.
4. Filter out any products where `metadata.release_at > Date.now()` (these are hidden on storefront).
5. Compare: `visible_count` (post client-filter) vs `count` from API.
   **Expected:** `count` from API may include future-dated products; client-side filter reduces the visible set. The storefront displays `Math.max(visible.length, count - hiddenCount)` or similar. Document any divergence. This is expected behavior, not a bug.  
   **Severity if failed:** Medium (count mismatch causes confusing UI)

---

### T-GUEST-026

**Title:** API: product payload for guest has no abv, calculated_price null  
**Role:** guest (API)  
**URL/Component:** `GET /store/products/:id`  
**Steps:**

1. Call `GET /store/products/{id}` with publishable key but no customer JWT.
2. Inspect payload: check for `metadata.abv` key presence.
3. Check `variants[0].calculated_price` — confirm it is `null` or absent.
   **Expected:** ABV may be present in metadata (it is public data) but the storefront gate hides it in the UI. `calculated_price` is null for guests as they are not in an approved group. Document actual payload shape.  
   **Severity if failed:** High if price data leaks to guest API consumers

---

## T-MEMBER: Approved member tests

---

### T-MEMBER-001

**Title:** Login success redirects and nav shows Breweries not Producers  
**Role:** member (approved)  
**URL/Component:** `/account` → login form  
**Steps:**

1. Open `/account` as guest — confirm login form shown.
2. Enter valid approved member credentials.
3. Submit.
4. Wait for redirect to `/account` dashboard.
5. Inspect desktop nav — confirm "Breweries" label is shown (not "Producers").
   **Expected:** Login succeeds, redirect to account dashboard, nav label is "Breweries" for approved members.  
   **Severity if failed:** Critical

---

### T-MEMBER-002

**Title:** Store shows prices, ABV, and Style filter for approved member  
**Role:** member  
**URL/Component:** `/store`  
**Steps:**

1. Authenticate as approved member.
2. Open `/store`.
3. Confirm product cards show price (e.g., `$XX.XX`).
4. Confirm ABV displayed on cards.
5. Confirm Style filter is visible in the filter toolbar.
   **Expected:** All three are visible. `canSeePricing=true` gates are satisfied.  
   **Severity if failed:** Critical

---

### T-MEMBER-003

**Title:** Store counter shows "X beers found" for approved member  
**Role:** member  
**URL/Component:** `/store`  
**Steps:**

1. Authenticate as approved member.
2. Open `/store`.
3. Read the product count text.
   **Expected:** Counter reads `{N} beers found` — not "releases found".  
   **Severity if failed:** High

---

### T-MEMBER-004

**Title:** PDP shows price, Add to Cart with qty stepper, ABV in tech specs  
**Role:** member  
**URL/Component:** `/products/[handle]`  
**Steps:**

1. Authenticate as approved member.
2. Open a product PDP with available stock.
3. Confirm price is shown prominently.
4. Confirm "Add to Cart" button is present.
5. Confirm a quantity stepper (`-` / `+` controls) is present.
6. Scroll to tech specs section — confirm ABV value is shown.
   **Expected:** All four elements visible. No Members Only overlay.  
   **Severity if failed:** Critical

---

### T-MEMBER-005

**Title:** Wishlist Management Panel: all 3 toggles present and target price saves  
**Role:** member  
**URL/Component:** `/products/[handle]` — in-stock product  
**Steps:**

1. Authenticate as approved member.
2. Open an in-stock product PDP.
3. Locate the Wishlist Management Panel.
4. Confirm 3 toggle controls are present (e.g., Add to wishlist, Restock alert, Price alert).
5. Set a target price value.
6. Save.
7. Reload the page.
8. Confirm target price persisted.
   **Expected:** Panel is visible (product is in-stock, `canSeePricing=true`, `hasEarlyAccess=true`). All 3 toggles present. Target price round-trips correctly.  
   **Severity if failed:** High

---

### T-MEMBER-006

**Title:** Out-of-stock PDP hides wishlist panel  
**Role:** member  
**URL/Component:** `/products/[handle]` — out-of-stock product  
**Steps:**

1. Authenticate as approved member.
2. Open a product PDP for an out-of-stock item.
3. Check for Wishlist Management Panel.
   **Expected:** Wishlist panel is NOT visible when `isOutOfStock=true`. This is confirmed by code — the `!isOutOfStock` guard in the panel condition.  
   **Severity if failed:** Medium

---

### T-MEMBER-007

**Title:** Add to cart updates cart count in nav  
**Role:** member  
**URL/Component:** `/store` → `/products/[handle]`  
**Steps:**

1. Authenticate as approved member.
2. Open a product PDP.
3. Note cart count in nav (should be 0 or existing count).
4. Click "Add to Cart".
5. Confirm cart count in nav increments by 1.
   **Expected:** Cart count badge updates immediately in nav after add.  
   **Severity if failed:** High

---

### T-MEMBER-008

**Title:** Cart page: item visible, qty change, and remove work  
**Role:** member  
**URL/Component:** `/cart`  
**Steps:**

1. Add at least one item to cart.
2. Navigate to `/cart`.
3. Confirm the added item is listed with name, price, qty.
4. Increment quantity using `+` — confirm line total updates.
5. Click remove/delete — confirm item disappears from cart.
   **Expected:** Cart renders correctly. Quantity and remove operations work. Cart total updates.  
   **Severity if failed:** Critical

---

### T-MEMBER-009

**Title:** Checkout delivery — full path to review step  
**Role:** member  
**URL/Component:** `/checkout`  
**Steps:**

1. Add an item to cart, then navigate to `/checkout`.
2. Confirm starting at `?step=fulfilment`.
3. Select "Delivery" option.
4. Click Continue — confirm advance to `?step=address`.
5. Fill address fields with valid Australian address. Continue.
6. Confirm advance to `?step=shipping`. Select a shipping option. Continue.
7. Confirm advance to `?step=payment`. Select PayID. Continue.
8. Confirm advance to `?step=review`.
9. Confirm order summary visible at review step.
   **Expected:** All 5 steps complete in order. No invalid step redirect fires. Review step shows correct summary.  
   **Severity if failed:** Critical

---

### T-MEMBER-010

**Title:** Checkout pickup flow skips address and shipping steps  
**Role:** member  
**URL/Component:** `/checkout`  
**Steps:**

1. Add item to cart. Navigate to `/checkout`.
2. Select "In-Store Pickup" (or "Click & Collect") at `?step=fulfilment`.
3. Click Continue.
4. Confirm next step is `?step=payment` — address and shipping steps skipped.
5. Select PayID. Continue.
6. Confirm `?step=review`.
   **Expected:** `address` and `shipping` steps are skipped entirely for pickup. Step jumps from `fulfilment` → `payment`.  
   **Severity if failed:** Critical

---

### T-MEMBER-011

**Title:** Checkout step guard: direct navigation to payment without completing address  
**Role:** member  
**URL/Component:** `/checkout?step=payment`  
**Steps:**

1. Add item to cart. Navigate to `/checkout`.
2. Do NOT complete fulfilment/address/shipping steps.
3. Manually navigate to `/checkout?step=payment`.
4. Observe where page redirects or what it shows.
   **Expected:** Step guard in `checkout/page.tsx` redirects to `?step=fulfilment` (or the first incomplete step). User cannot skip steps by direct URL manipulation.  
   **Severity if failed:** High

---

### T-MEMBER-012

**Title:** PayID reference format is HG-{8 chars of cart ID, uppercased, non-alphanumeric stripped}  
**Role:** member  
**URL/Component:** `/checkout?step=payment`  
**Steps:**

1. Proceed to `?step=payment` with PayID selected.
2. Read the displayed PayID reference string.
3. Confirm format: starts with `HG-`, followed by 8 uppercase alphanumeric characters.
4. Retrieve the cart ID from the API (`GET /store/carts/{id}`).
5. Manually compute: take last 8 chars of cart ID, strip non-alphanumeric, uppercase.
6. Compare computed reference to displayed reference.
   **Expected:** Displayed reference matches the computed format exactly.  
   **Severity if failed:** High (customer can't complete PayID transfer if reference is wrong)

---

### T-MEMBER-013

**Title:** Account sub-pages render: VIP ladder, referrals, wishlist tabs, alerts, email settings  
**Role:** member  
**URL/Component:** `/account/vip`, `/account/referrals`, `/account/wishlist`, `/account/alerts`, `/account/email-settings`  
**Steps:**

1. Authenticate as approved member.
2. Navigate to each sub-page in turn:
   - `/account/vip` — confirm tier ladder shows, score displayed.
   - `/account/referrals` — confirm referral code shown, share options present.
   - `/account/wishlist` — confirm 5 tabs present (all wishlist categories).
   - `/account/alerts` — confirm alert preferences render.
   - `/account/email-settings` — confirm email toggle options render.
3. Confirm no page crashes or shows 404.
   **Expected:** All 5 sub-pages render with their respective content. No empty-state errors.  
   **Severity if failed:** High

---

### T-MEMBER-014

**Title:** Password change — wrong old password returns error, short password rejected, happy path works  
**Role:** member  
**URL/Component:** `/account/profile` or `/account/security`  
**Steps:**

1. Authenticate as approved member.
2. Navigate to password change section.
3. Enter an incorrect current password. Submit. Confirm error message.
4. Enter correct current password but new password of 7 chars (below minimum). Submit. Confirm validation error.
5. Enter correct current password and valid new password (≥8 chars, or per policy). Submit.
6. Confirm success message.
7. Log out and log back in with new password to confirm it was saved.
   **Expected:** Wrong old password → 401/error. Short new password → validation error. Valid change → success + confirmed by re-login.  
   **Severity if failed:** High

---

### T-MEMBER-015

**Title:** Logout clears session and nav reverts to guest state  
**Role:** member  
**URL/Component:** Nav → logout action  
**Steps:**

1. Authenticate as approved member. Confirm Breweries label in nav.
2. Trigger logout (profile dropdown or logout button).
3. Confirm redirect to `/` or `/account`.
4. Inspect nav — confirm it shows guest state (Sign In, Apply; no cart count, no wishlist).
5. Attempt to navigate to `/cart` — confirm redirect to `/`.
   **Expected:** Session fully cleared. Nav reverts to guest. Protected routes redirect.  
   **Severity if failed:** Critical

---

### T-MEMBER-016

**Title:** Suspended member can still log in (auth-disable bug hypothesis)  
**Role:** suspended member  
**URL/Component:** `/account` login form + Admin panel  
**Steps:**

1. In admin panel, find an approved member and suspend them.
2. Confirm the member appears in "Suspended" tab.
3. Attempt login with the suspended member's credentials.
4. Observe: 401 Unauthorized, or successful login?
   **Expected (hypothesis):** Login **succeeds** despite suspension, because `setAuthIdentityDisabledStep` writes to `provider_metadata` on `auth_identity` (non-existent column) instead of `provider_identity`. The disable action silently does nothing.  
   **Severity if failed:** Critical (suspended members retain access — security vulnerability)  
   **[H-AUTH-DISABLE]**

---

### T-MEMBER-017

**Title:** Reactivated member can log in (reactivate is no-op due to same bug)  
**Role:** suspended → reactivated member  
**URL/Component:** Admin panel → member reactivate  
**Steps:**

1. Confirm a suspended member can log in (from T-MEMBER-016 hypothesis).
2. In admin panel, reactivate the same member.
3. Attempt login again.
4. Observe: succeeds or fails?
   **Expected (hypothesis):** Since disable never worked, reactivate is also a no-op. Login succeeds both before and after reactivate. Member group flips back to previous group.  
   **Severity if failed:** High (documents extent of auth-disable bug)  
   **[H-AUTH-DISABLE]**

---

## T-ADMIN: Admin tests

---

### T-ADMIN-001

**Title:** Admin login form: .test TLD email submission behavior  
**Role:** admin  
**URL/Component:** `http://localhost:9000/app` — login form  
**Steps:**

1. Open the Medusa admin login page.
2. Enter `admin@example.test` as email and any password.
3. Submit.
4. Observe: does the form submit, return 401, or silently reject without API call?
5. Inspect network requests — confirm whether a POST to `/auth/user/emailpass` was made.
   **Expected:** Form submits to the API. If credentials are wrong, a 401 is returned. The `.test` TLD should not cause silent rejection in this codebase (no TLD filter confirmed in Medusa admin). Document actual behavior.  
   **Severity if failed:** Medium (if .test TLD blocks legitimate admin test accounts)

---

### T-ADMIN-002

**Title:** Members list: search, tabs (pending/approved/suspended) all functional  
**Role:** admin  
**URL/Component:** `/app` → Members section  
**Steps:**

1. Open admin members list.
2. Confirm default tab shows pending members (if any).
3. Click "Approved" tab — confirm approved members listed.
4. Click "Suspended" tab — confirm suspended members listed.
5. Use search input (name or email) — confirm filtered results.
6. Clear search — confirm full list restores.
   **Expected:** All three tabs show correct member subsets. Search filters correctly.  
   **Severity if failed:** High

---

### T-ADMIN-003

**Title:** Approve single member: confirm dialog does NOT appear  
**Role:** admin  
**URL/Component:** Admin → Members → Pending tab  
**Steps:**

1. Find a pending member.
2. Click Approve (single action).
3. Observe: does a confirm/prompt dialog appear before action executes?
   **Expected (hypothesis):** Approve fires immediately — no confirm dialog. This is inconsistent with reject/suspend which do show confirms.  
   **Severity if failed:** High (accidental approvals have no undo)  
   **[H-APPROVE-NO-CONFIRM]**

---

### T-ADMIN-004

**Title:** Bulk approve members: confirm dialog does NOT appear  
**Role:** admin  
**URL/Component:** Admin → Members → Pending tab  
**Steps:**

1. Select multiple pending members via checkboxes.
2. Click bulk Approve.
3. Observe: confirm dialog present?
   **Expected (hypothesis):** No confirm dialog for bulk approve.  
   **Severity if failed:** Critical (bulk accidental approval)  
   **[H-APPROVE-NO-CONFIRM]**

---

### T-ADMIN-005

**Title:** Reject single member: confirm dialog appears  
**Role:** admin  
**URL/Component:** Admin → Members  
**Steps:**

1. Find a pending member.
2. Click Reject.
3. Observe: `usePrompt` confirm dialog should appear.
4. Click Cancel — confirm action does not execute.
5. Click Reject again, confirm in dialog — confirm action executes.
   **Expected:** Confirm dialog appears. Cancelling prevents action. Confirming proceeds.  
   **Severity if failed:** High

---

### T-ADMIN-006

**Title:** Suspend member: confirm dialog appears  
**Role:** admin  
**URL/Component:** Admin → Members → Approved member detail  
**Steps:**

1. Open an approved member's detail/drawer.
2. Click Suspend.
3. Observe: `usePrompt` confirm dialog appears.
4. Cancel — confirm no change. Suspend again and confirm — action executes.
   **Expected:** Confirm dialog shown before suspend.  
   **Severity if failed:** High

---

### T-ADMIN-007

**Title:** Reactivate member: confirm dialog does NOT appear  
**Role:** admin  
**URL/Component:** Admin → Members → Suspended member  
**Steps:**

1. Find a suspended member.
2. Click Reactivate.
3. Observe: does confirm dialog appear?
   **Expected (hypothesis):** Code explicitly skips prompt for reactivate. Action fires immediately.  
   **Severity if failed:** Medium  
   **[H-REACTIVATE-NO-CONFIRM]**

---

### T-ADMIN-008

**Title:** Heat-hold toggle: no confirm dialog before flipping  
**Role:** admin  
**URL/Component:** Admin → Site Config or Shipping settings  
**Steps:**

1. Navigate to heat-hold / shipping hold controls.
2. Toggle heat-hold ON.
3. Observe: confirm dialog present?
4. Toggle OFF. Confirm dialog present?
   **Expected (hypothesis):** No confirm dialog. Toggle immediately blocks or unblocks ALL shipments site-wide.  
   **Severity if failed:** Critical (accidental activation blocks all fulfillment with no warning)  
   **[H-HEAT-HOLD-NO-CONFIRM]**

---

### T-ADMIN-009

**Title:** Campaign expire: no confirm dialog  
**Role:** admin  
**URL/Component:** Admin → Campaigns  
**Steps:**

1. Find an active campaign.
2. Click Expire.
3. Observe: confirm dialog?
   **Expected (hypothesis):** No confirm. Action fires immediately.  
   **Severity if failed:** High

---

### T-ADMIN-010

**Title:** Campaign activate: no confirm dialog  
**Role:** admin  
**URL/Component:** Admin → Campaigns  
**Steps:**

1. Find a draft/inactive campaign.
2. Click Activate.
3. Observe: confirm dialog?
   **Expected (hypothesis):** No confirm. Action fires immediately.  
   **Severity if failed:** High

---

### T-ADMIN-011

**Title:** Site config revert: no confirm dialog  
**Role:** admin  
**URL/Component:** Admin → Site Config  
**Steps:**

1. Navigate to site configuration.
2. Click "Revert" (or equivalent reset action).
3. Observe: confirm dialog?
   **Expected (hypothesis):** No confirm. Reverts immediately.  
   **Severity if failed:** High

---

### T-ADMIN-012

**Title:** Hop deactivate: no confirm dialog  
**Role:** admin  
**URL/Component:** Admin → Hops  
**Steps:**

1. Find an active hop entry.
2. Click Deactivate.
3. Observe: confirm dialog?
   **Expected (hypothesis):** No confirm. Deactivates immediately.  
   **Severity if failed:** Medium

---

### T-ADMIN-013

**Title:** Buy-at-price: $0 offer passes server-side and creates free order  
**Role:** admin  
**URL/Component:** Admin → Buy-at-Price feature  
**Steps:**

1. Create a buy-at-price offer for a $30+ product. Set `offer_price = 0`.
2. Confirm: is the Approve button disabled, or is a validation error shown?
3. If not blocked, approve the offer.
4. As the target member, add the product to cart — observe price shown.
5. Proceed to checkout review — confirm total is $0.
   **Expected (hypothesis):** Server only checks `offer_price != null`, so `0` passes. No `> 0` guard exists. $0 offer creates a $30 discount delta, giving the member the product free. This is a critical pricing bug. Document whether any client-side guard blocks `0` input.  
   **Severity if failed:** Critical (arbitrary $0 pricing)  
   **[H-BUY-AT-PRICE-ZERO]**

---

### T-ADMIN-014

**Title:** Buy-at-price: negative offer price is blocked  
**Role:** admin  
**URL/Component:** Admin → Buy-at-Price  
**Steps:**

1. Create a buy-at-price offer. Set `offer_price = -5`.
2. Observe: form validation, disabled button, or API error?
   **Expected:** Negative price should be rejected by form validation or server. Document the specific guard location (client vs. server).  
   **Severity if failed:** Critical

---

### T-ADMIN-015

**Title:** Ship-from address: auto-saves on field blur without explicit Save click  
**Role:** admin  
**URL/Component:** Admin → Shipping / Locations  
**Steps:**

1. Navigate to ship-from address configuration.
2. Change a field (e.g., suburb/city).
3. Click out of the field (blur event, no explicit Save button clicked).
4. Reload the page.
5. Confirm whether the change persisted.
   **Expected:** Document actual auto-save behavior. If auto-saving on blur, confirm that partial/invalid entries do not corrupt the address.  
   **Severity if failed:** Medium

---

### T-ADMIN-016

**Title:** Insights page renders KPI cards without error  
**Role:** admin  
**URL/Component:** Admin → Insights  
**Steps:**

1. Navigate to the Insights page.
2. Confirm KPI cards render (revenue, member count, orders, etc.).
3. Confirm no console errors or empty states due to missing data.
   **Expected:** Insights page renders with data. No crashes.  
   **Severity if failed:** Medium

---

### T-ADMIN-017

**Title:** Member approval end-to-end: pending → approve → member can login  
**Role:** admin + pending member  
**URL/Component:** Admin approve flow + storefront login  
**Steps:**

1. Register a new member via `/apply` (all valid fields, DOB ≥18).
2. Submit — confirm redirect to `/apply/pending`.
3. In admin, find the pending member.
4. Approve (single).
5. In a fresh browser context, log in as the newly approved member.
6. Confirm nav shows approved-state (Breweries label, cart visible).
7. Confirm `/store` shows prices.
   **Expected:** Full lifecycle works. Fresh context required to get non-stale auth session (see regression note in sprint history).  
   **Severity if failed:** Critical

---

### T-ADMIN-018

**Title:** Member drawer shows all fields correctly  
**Role:** admin  
**URL/Component:** Admin → Member detail drawer  
**Steps:**

1. Open an approved member's detail drawer.
2. Confirm: name, email, date of birth (or age), why_join text, favourite_brewery, referral code (if generated), VIP score, status.
3. Confirm no raw HTML or script tags visible in any field (XSS mitigation from T-GUEST-012).
   **Expected:** All member fields displayed. No HTML injection visible.  
   **Severity if failed:** High

---

### T-ADMIN-019

**Title:** Stock import page: tabs render  
**Role:** admin  
**URL/Component:** Admin → Stock Import  
**Steps:**

1. Navigate to stock import section.
2. Confirm tabs or sections render (e.g., import, history, or template download).
3. Confirm no 404 or crash.
   **Expected:** Stock import UI renders without error.  
   **Severity if failed:** Medium

---

## T-VISUAL: Visual / UX tests

Visual tests should be run at three viewports: 1440×900 (desktop), 768×1024 (tablet), 390×844 (mobile). Compare against design references where available. Use screenshot diffing for regression.

---

### T-VISUAL-001

**Title:** Homepage: section spacing and vertical rhythm consistent  
**Role:** guest  
**URL/Component:** `/`  
**Steps:** Screenshot full page at 1440px. Verify consistent vertical padding between Hero, New Arrivals, Featured Producers, and Footer. No collapsed or overlapping sections.  
**Expected:** ~48–80px consistent vertical gaps between sections.  
**Severity if failed:** Cosmetic

---

### T-VISUAL-002

**Title:** Homepage: typography hierarchy — H1 > H2 > body text distinct  
**Role:** guest  
**URL/Component:** `/`  
**Steps:** Inspect heading sizes. Hero H1 should visually dominate. Section headings (H2) clearly subordinate. Body text legible.  
**Expected:** Visual hierarchy clear at all breakpoints.  
**Severity if failed:** Cosmetic

---

### T-VISUAL-003

**Title:** Homepage: New Arrivals card heights are uniform in the horizontal rail  
**Role:** guest  
**URL/Component:** `/` — New Arrivals rail  
**Steps:** Check that all product cards in the New Arrivals rail share the same height. No card taller or shorter due to long titles.  
**Expected:** Uniform card heights via CSS (min-height or fixed height).  
**Severity if failed:** Cosmetic

---

### T-VISUAL-004

**Title:** Homepage: Featured Producers cards uniform and image-filled  
**Role:** guest  
**URL/Component:** `/` — Featured Producers  
**Steps:** Check brewery cards for uniform size, image loading, and consistent label position.  
**Expected:** Uniform card sizes. Images load (no broken img). Labels consistently positioned.  
**Severity if failed:** Cosmetic

---

### T-VISUAL-005

**Title:** Footer: links and layout correct at all breakpoints  
**Role:** guest  
**URL/Component:** Footer on `/`  
**Steps:** Screenshot footer at 1440px, 768px, 390px. Check link columns stack correctly on mobile.  
**Expected:** No overflow, no truncated links, correct responsive stacking.  
**Severity if failed:** Cosmetic

---

### T-VISUAL-006

**Title:** Store grid: locked cards (guest) vs unlocked cards (member) visually distinct  
**Role:** guest + member  
**URL/Component:** `/store`  
**Steps:** Side-by-side screenshot of store grid as guest vs member. Locked cards should have overlay / lock icon. Unlocked cards show price/ABV.  
**Expected:** Clear visual distinction between locked and unlocked states.  
**Severity if failed:** High (if overlay is missing — gate not visible)

---

### T-VISUAL-007

**Title:** Store grid: consistent card dimensions across products  
**Role:** member  
**URL/Component:** `/store`  
**Steps:** Check product grid — all cards same height. No orphan cards spanning extra rows.  
**Expected:** Uniform card grid (masonry layout intentional excepted).  
**Severity if failed:** Cosmetic

---

### T-VISUAL-008

**Title:** Store: filter chips have consistent height and pill shape  
**Role:** member  
**URL/Component:** `/store` filter toolbar  
**Steps:** Inspect all active filter chips — height, border-radius, typography.  
**Expected:** Uniform pill appearance.  
**Severity if failed:** Cosmetic

---

### T-VISUAL-009

**Title:** Store: sort dropdown aligns with filter row on desktop  
**Role:** member  
**URL/Component:** `/store`  
**Steps:** At 1440px, check sort dropdown is vertically aligned with filter chips in the same toolbar row.  
**Expected:** No misalignment, correct vertical centering.  
**Severity if failed:** Cosmetic

---

### T-VISUAL-010

**Title:** Store: empty state renders correctly when all filters produce no results  
**Role:** member  
**URL/Component:** `/store`  
**Steps:** Apply a combination of filters that produce 0 results. Check empty state.  
**Expected:** Clear empty state message (e.g., "No beers found — try different filters"). Not a blank page.  
**Severity if failed:** Medium

---

### T-VISUAL-011

**Title:** PDP: price is visually prominent and above the fold on desktop  
**Role:** member  
**URL/Component:** `/products/[handle]`  
**Steps:** Open PDP at 1440px. Check price position relative to fold (800px height).  
**Expected:** Price visible without scrolling. No need to scroll to find the buy CTA.  
**Severity if failed:** High (conversion impact)

---

### T-VISUAL-012

**Title:** PDP: CTA hierarchy — primary Add to Cart is most prominent  
**Role:** member  
**URL/Component:** `/products/[handle]`  
**Steps:** Check button visual weight hierarchy. "Add to Cart" should be the most visually prominent interactive element.  
**Expected:** Add to Cart button has highest visual weight (size, color, contrast vs secondary actions).  
**Severity if failed:** Medium

---

### T-VISUAL-013

**Title:** PDP: out-of-stock state is visually distinct  
**Role:** member  
**URL/Component:** `/products/[handle]` — OOS product  
**Steps:** Open an out-of-stock product. Check button state and any OOS badge.  
**Expected:** "Add to Cart" is disabled or replaced with "Out of Stock" label. Visually distinct from available state.  
**Severity if failed:** High

---

### T-VISUAL-014

**Title:** PDP: image gallery renders without white flash or layout shift  
**Role:** guest  
**URL/Component:** `/products/[handle]`  
**Steps:** Load PDP on slow network throttle. Observe image loading behavior (placeholder → loaded).  
**Expected:** No layout shift (CLS). Skeleton/placeholder shown while images load.  
**Severity if failed:** Medium

---

### T-VISUAL-015

**Title:** PDP: mobile layout — single column, no horizontal overflow  
**Role:** guest  
**URL/Component:** `/products/[handle]` at 390px  
**Steps:** Set viewport 390×844. Check for horizontal scrollbar. Check all elements within viewport width.  
**Expected:** No horizontal overflow. Content stacks correctly in single column.  
**Severity if failed:** High

---

### T-VISUAL-016

**Title:** Nav desktop: all approved-member icons present and correctly spaced  
**Role:** member  
**URL/Component:** Any page at 1440px  
**Steps:** Screenshot nav. Confirm presence of: Wishlist icon, Search icon, Theme toggle, Referrals, VIP badge, Profile avatar, Notifications, Cart icon.  
**Expected:** All 8 elements visible and evenly spaced. No overflow.  
**Severity if failed:** Medium

---

### T-VISUAL-017

**Title:** Nav desktop: guest nav has exactly Sign In and Apply CTAs  
**Role:** guest  
**URL/Component:** Any page at 1440px  
**Steps:** Screenshot guest nav. Confirm Sign In and Apply CTAs present. Confirm no cart icon visible.  
**Expected:** Cart icon absent for guest on desktop nav.  
**Severity if failed:** Medium

---

### T-VISUAL-018

**Title:** Buttons: consistent height and border-radius across all variants  
**Role:** guest  
**URL/Component:** `/apply` (has multiple button types)  
**Steps:** Inspect all button variants — primary, secondary, destructive. Measure heights and border-radius via devtools.  
**Expected:** Heights uniform (e.g., 44px). Border-radius consistent with design system.  
**Severity if failed:** Cosmetic

---

### T-VISUAL-019

**Title:** Dark mode: all text maintains sufficient contrast  
**Role:** member  
**URL/Component:** `/store` — dark mode activated  
**Steps:** Toggle to dark mode. Check all text elements on store page for contrast (target: ≥4.5:1 for body, ≥3:1 for large text).  
**Expected:** No low-contrast text in dark mode.  
**Severity if failed:** High (accessibility)

---

### T-VISUAL-020

**Title:** Apply page: form layout is single-column, readable on mobile  
**Role:** guest  
**URL/Component:** `/apply` at 390px  
**Steps:** Set viewport 390×844. Screenshot apply form. Check field widths, label visibility, button at bottom.  
**Expected:** Full-width inputs, all labels visible, no truncation, submit button accessible.  
**Severity if failed:** High

---

### T-VISUAL-021

**Title:** Mobile bottom nav: all 5 tabs visible and labelled correctly  
**Role:** guest  
**URL/Component:** Any page at 390px  
**Steps:** Check bottom nav. Confirm 5 tabs: Collection, Breweries/Producers, Hops, Cart, Account.  
**Expected:** All 5 present. Labels readable. Active state visible.  
**Severity if failed:** Medium

---

### T-VISUAL-022

**Title:** Mobile bottom nav: active tab indicator correct for current route  
**Role:** member  
**URL/Component:** `/store`, `/breweries`, `/hops` at 390px  
**Steps:** Navigate to each section. Check which bottom nav tab is highlighted.  
**Expected:** Correct tab active-highlighted for current route.  
**Severity if failed:** Cosmetic

---

### T-VISUAL-023

**Title:** Checkout: step indicator reflects current step  
**Role:** member  
**URL/Component:** `/checkout` at each step  
**Steps:** Progress through checkout steps. At each step, check that the step indicator/breadcrumb highlights the correct step.  
**Expected:** Step indicator correct at each step transition.  
**Severity if failed:** Medium

---

### T-VISUAL-024

**Title:** VIP tier ladder: tiers visually distinct, active tier highlighted  
**Role:** vip2 member  
**URL/Component:** `/account/vip`  
**Steps:** Open VIP page as a vip2 member. Check the tier ladder visual. Active tier (vip2) should be highlighted/accented.  
**Expected:** Active tier clearly distinguished. Tiers above grayed out or shown as future goals.  
**Severity if failed:** Cosmetic

---

### T-VISUAL-025

**Title:** Pending application page: clear status message, no broken layout  
**Role:** pending  
**URL/Component:** `/apply/pending`  
**Steps:** Open `/apply/pending` (or redirect after apply submission).  
**Expected:** Clear "Application Pending" message. No broken layout or overlapping elements. Friendly copy.  
**Severity if failed:** Medium

---

## T-A11Y: Accessibility tests

Tests should use axe-core or Playwright's accessibility assertions, plus manual keyboard navigation.

---

### T-A11Y-001

**Title:** Focus order follows visual reading order on homepage  
**Role:** guest  
**URL/Component:** `/`  
**Steps:**

1. Open `/` and press Tab repeatedly from top.
2. Confirm focus moves left-to-right, top-to-bottom.
3. Confirm no focus trap before the main content area (i.e., skip-nav not blocking).
   **Expected:** Focus order matches visual layout. No invisible or unexpected focus jumps.  
   **Severity if failed:** High

---

### T-A11Y-002

**Title:** Skip navigation link present and functional  
**Role:** guest  
**URL/Component:** Any page  
**Steps:**

1. Press Tab once from the top of any page.
2. Confirm a "Skip to main content" link appears (may be visually hidden until focused).
3. Press Enter — confirm focus jumps to `<main>`.
   **Expected:** Skip link present and functional.  
   **Severity if failed:** High

---

### T-A11Y-003

**Title:** Heading structure is semantic (single H1, logical H2/H3 nesting)  
**Role:** guest  
**URL/Component:** `/`, `/store`, `/products/[handle]`  
**Steps:**

1. On each page, run `document.querySelectorAll('h1,h2,h3,h4')` — count H1s, check nesting.
2. Confirm: exactly one H1 per page. H2s are section headings. H3s are sub-items.
   **Expected:** No multiple H1s. No skipped levels (e.g., H1 → H3). Logical nesting throughout.  
   **Severity if failed:** Medium

---

### T-A11Y-004

**Title:** All images have meaningful alt text (or empty alt for decorative)  
**Role:** guest  
**URL/Component:** `/`, `/store`, `/products/[handle]`  
**Steps:**

1. Run axe-core or query `img` elements without alt attribute.
2. For product images, confirm alt includes product name.
3. For decorative icons, confirm `alt=""` or `aria-hidden="true"`.
   **Expected:** No images missing alt. Decorative images use empty alt or aria-hidden.  
   **Severity if failed:** High

---

### T-A11Y-005

**Title:** Color is not the sole indicator of interactive state  
**Role:** guest + member  
**URL/Component:** `/store`, `/apply`  
**Steps:**

1. Check filter chips: active vs inactive. Is there a shape/text difference beyond color?
2. Check form validation errors: is there an icon or border shape in addition to red color?
   **Expected:** Interactive states communicated by at least two visual cues (e.g., color + underline, color + icon, color + border weight).  
   **Severity if failed:** High

---

### T-A11Y-006

**Title:** All form fields have associated labels (not placeholder-only)  
**Role:** guest  
**URL/Component:** `/apply`  
**Steps:**

1. For each input in the apply form, confirm a `<label>` element is programmatically associated via `for`/`id` or `aria-labelledby`.
2. Confirm labels remain visible when field is filled (placeholder disappears but label must persist).
   **Expected:** Every field has a visible, persistent label. No input uses placeholder as the sole label.  
   **Severity if failed:** High

---

### T-A11Y-007

**Title:** Form validation errors are announced to screen readers  
**Role:** guest  
**URL/Component:** `/apply`  
**Steps:**

1. Submit apply form with empty required fields.
2. Confirm error messages appear inline near each field.
3. Confirm errors are linked to their fields via `aria-describedby` or error is inside a `role="alert"` region.
   **Expected:** Errors announced via live region or linked via aria. Screen reader users hear error message associated with the field.  
   **Severity if failed:** High

---

### T-A11Y-008

**Title:** Interactive elements meet 44×44px minimum touch target size  
**Role:** guest  
**URL/Component:** Mobile bottom nav, PDP CTA, cart controls at 390px  
**Steps:**

1. Measure touch targets of: bottom nav tabs, Add to Cart button, qty stepper +/- buttons, filter chips.
2. Confirm all ≥44×44px (WCAG 2.5.5 AAA / 2.5.8 AA target).
   **Expected:** All interactive targets meet minimum size. Qty stepper +/- buttons are a common failure point.  
   **Severity if failed:** High (mobile usability)

---

### T-A11Y-009

**Title:** Checkout step dialogs/modals trap focus correctly  
**Role:** member  
**URL/Component:** `/checkout` — any confirmation modal  
**Steps:**

1. If a confirmation dialog opens (e.g., leave checkout confirmation), confirm:
   - Tab key stays within the dialog.
   - Escape closes the dialog.
   - Focus returns to trigger element on close.
     **Expected:** Dialog focus trap active. No focus escape to background content.  
     **Severity if failed:** High

---

### T-A11Y-010

**Title:** Theme toggle has accessible label  
**Role:** guest  
**URL/Component:** Nav — theme toggle  
**Steps:**

1. Inspect theme toggle button: check for `aria-label`, `title`, or visually hidden text.
2. Tab to it — confirm screen reader announces a meaningful name (e.g., "Toggle dark mode").
   **Expected:** Button has accessible name. Not just an unlabelled icon.  
   **Severity if failed:** Medium

---

### T-A11Y-011

**Title:** Admin confirm dialogs (usePrompt) trap focus  
**Role:** admin  
**URL/Component:** Admin → Reject member action  
**Steps:**

1. Trigger a reject action to open the confirm dialog.
2. Tab through dialog — confirm focus stays inside.
3. Escape — confirm dialog closes.
   **Expected:** Focus trapped in confirm dialog. No keyboard access to background.  
   **Severity if failed:** High

---

### T-A11Y-012

**Title:** Cart item remove button has accessible label  
**Role:** member  
**URL/Component:** `/cart`  
**Steps:**

1. Open cart with items.
2. Inspect remove button — check for `aria-label` or visually hidden text like "Remove [product name]".
   **Expected:** Remove button labelled with product name context (not just "Remove" without context, and not just an ×icon without any label).  
   **Severity if failed:** Medium

---

### T-A11Y-013

**Title:** Product image alt text on PDP matches product name  
**Role:** guest  
**URL/Component:** `/products/[handle]`  
**Steps:**

1. Open PDP.
2. Inspect primary product image `alt` attribute.
3. Confirm it includes the product name.
   **Expected:** `alt="[Product Name] — [Brewery Name]"` or similar meaningful string.  
   **Severity if failed:** Medium

---

### T-A11Y-014

**Title:** Axe-core zero critical violations on core guest pages  
**Role:** guest  
**URL/Component:** `/`, `/store`, `/apply`, `/products/[handle]`  
**Steps:**

1. Run `axe.run()` on each page (via Playwright + `@axe-core/playwright`).
2. Filter for `violations` with impact `critical` or `serious`.
3. Assert zero critical/serious violations.
   **Expected:** No critical or serious axe violations on the four core guest pages.  
   **Severity if failed:** High

---

### T-A11Y-015

**Title:** Reduced motion: animations respect `prefers-reduced-motion`  
**Role:** guest  
**URL/Component:** `/` — Hero, transitions  
**Steps:**

1. Set OS to "Reduce motion" (macOS: Accessibility → Reduce Motion).
2. Open `/` — check Hero animation, page transitions, card hover effects.
3. Confirm animations are suppressed or replaced with instant transitions.
   **Expected:** Animations respect `prefers-reduced-motion: reduce`. No looping or auto-playing motion for users who've opted out.  
   **Severity if failed:** High (vestibular disorder accessibility)

---

## Appendix: Test environment checklist

Before running this plan, confirm:

- [ ] Backend running at `:9000` (Medusa v2)
- [ ] Storefront running at `:8000` (Next.js 15)
- [ ] Postgres, Redis, MeiliSearch services up via Docker
- [ ] At least one admin user seeded (`admin@hopsandglory.au` or equivalent)
- [ ] At least one approved member account available (or use `just seed-e2e` to provision)
- [ ] At least one pending member account available
- [ ] At least one suspended member account available
- [ ] Products seeded with inventory (`just seed-e2e` provisions 9 catalog products + 6 release-at fixtures)
- [ ] Shipping options priced and linked to sales channel (`fix-shipping-prices.ts` run)
- [ ] PayID payment provider active (`pp_payid_payid`)
- [ ] Publishable API key available in `.env.local`

## Appendix: Known gaps / deferred work

| Gap                            | Location                           | Recommendation                                                                   |
| ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------- |
| Auth-disable bug               | `setAuthIdentityDisabledStep`      | Fix to target `provider_identity.disabled` not `auth_identity.provider_metadata` |
| $0 buy-at-price                | Server-side buy-at-price validator | Add `offer_price > 0` guard                                                      |
| Approve with no confirm        | Admin member approve action        | Add `usePrompt` confirm dialog                                                   |
| Reactivate with no confirm     | Admin member reactivate action     | Add `usePrompt` confirm dialog                                                   |
| Heat-hold with no confirm      | Admin heat-hold toggle             | Add `usePrompt` with "This will block ALL shipments" warning                     |
| TrustBar dead component        | `apps/storefront/src/app/page.tsx` | Either import TrustBar or delete the component                                   |
| New Arrivals dead chevrons     | Homepage New Arrivals              | Implement scroll handler or remove buttons                                       |
| untappd_id dead field          | Apply form                         | Either render the input or remove from schema                                    |
| Mobile nav guest inconsistency | Mobile bottom nav                  | Either hide Cart for guests or add redirect with explanation                     |
| /account/vip guest access      | Route file lacks auth guard        | Add `notFound()` or redirect guard                                               |
