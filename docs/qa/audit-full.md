# Hops & Glory — Full QA Audit Report

**Date:** 2026-06-08  
**Auditor:** Cortex Code (principal-level QA, design, and accessibility)  
**Stack:** Backend :9000 (Medusa v2) · Storefront :8000 (Next.js 15) · Admin :9000/app  
**Repo:** `/Users/cmasterson/projects/HandG`  
**Prior partial audit:** `docs/qa/audit-2026-06-07.md` — superseded by this report

---

## 1. Executive Summary

### Overall quality assessment

Hops & Glory has a genuinely well-conceived product: the membership gating, brand tone, and feature set (VIP tiers, buy-at-price, referral network, early access countdowns) are ambitious and largely functional at the API layer. The backend data model and permission architecture are solid. The storefront guest-gating at the API level is confirmed correct — prices, ABV, and inventory are stripped from API payloads, not merely hidden in the UI.

However, the application is **not launch-ready.** There are:

- Two **critical security failures** that allow suspended/rejected users to authenticate indefinitely
- Four **critical functional failures** that block core user journeys (delivery checkout stuck, PDP showing guest state to members, price alert unresponsive, apply-form labels inaccessible to screen readers)
- Systemic **accessibility gaps** including a WCAG Level A bypass-blocks failure, no focus indicators on nav elements, and no accessible labels on form inputs
- A growing set of **admin safety gaps** where destructive actions (blocking all shipments, approving $0 promotions) execute without confirmation

The product appears visually polished in screenshots but unravels under real interaction.

### Issue counts

| Severity  | Count  |
| --------- | ------ |
| Critical  | 8      |
| High      | 21     |
| Medium    | 16     |
| Low       | 12     |
| Cosmetic  | 6      |
| **Total** | **63** |

### Launch readiness verdict

**NOT READY.** Conditionally ready once: (1) security bugs are patched, (2) delivery checkout progression is fixed, (3) member PDP session state is resolved, (4) WCAG Level A failure is addressed. All four are achievable in a single sprint.

---

## 2. Product Map

### Routes discovered

| Path                                 | Guard                                                                            | Notes                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `/`                                  | None                                                                             | Hero branches: guest/pending=full splash, approved=compact bar |
| `/store`                             | None                                                                             | canSeePricing drives all price/filter/sort visibility          |
| `/products/[handle]`                 | None                                                                             | Triple branch: approved, pending, guest                        |
| `/breweries` + `/breweries/[slug]`   | None                                                                             | Label: "Producers" (guest) / "Breweries" (approved)            |
| `/hops` + `/hops/[slug]`             | None                                                                             | Public                                                         |
| `/apply`                             | Soft: approved→/account, pending→/apply/pending                                  | ApplyForm is client component                                  |
| `/apply/pending` + `/apply/rejected` | None                                                                             | Static pages                                                   |
| `/cart`                              | Middleware: no JWT→redirect `/`                                                  | No message shown                                               |
| `/checkout`                          | Middleware: no JWT→redirect `/`; empty cart→/cart; invalid step→?step=fulfilment |                                                                |
| `/account`                           | Parallel slot: customer→@dashboard, none→@login                                  | Correct                                                        |
| `/account/@dashboard/*`              | Per-page notFound() or redirect()                                                | Inconsistent — some sub-routes show "Nothing here." to guests  |
| `/shipping`                          | None                                                                             | Public shipping info page                                      |
| `/order/[id]/*`                      | None                                                                             | Order confirmation/transfer                                    |

### Roles tested

- Guest (unauthenticated)
- `approved@example.test / TestApproved123!` (approved member)
- `pending@example.test / TestPending123!` (pending member)
- `admin@example.test / ChangeMe123!` (admin)

### Features identified

Registration/apply, login, membership lifecycle (approve/suspend/reject/reactivate), store browsing with VIP-gated products and early-access countdowns, product detail with wishlist management, cart, checkout (delivery + pickup + PayID), account (VIP ladder, referrals, wishlist, alerts, email preferences, addresses, password change), hops catalog, breweries, admin members CRUD, admin shipping (heat-hold, address, carriers), admin buy-at-price, admin campaigns, admin site config, admin catalog/hop taxonomy, admin insights, admin stock import.

---

## 3. Method

### How expected behavior was derived

Codebase recon (explore agents) mapped all routes, conditional rendering patterns, middleware guards, form schemas, workflow logic, and admin component code. Browser agents executed the test plan across guest, member, and admin roles. Expected behavior was inferred from code where no other spec exists.

### Viewports tested

- 1440px (desktop) — primary
- 768px (tablet) — DOM breakpoint verification
- 390px (mobile) — DOM/CSS analysis; screenshots not reliable for mobile CSS verification

### Test coverage

| Area                                                 | Coverage                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| Guest storefront (all routes)                        | Full                                                       |
| Approved member (store, PDP, cart, checkout pickup)  | Full                                                       |
| Approved member (checkout delivery)                  | Partial — blocked at shipping step bug                     |
| Approved member (account sub-pages)                  | Full                                                       |
| Admin (members, shipping, buy-at-price, site config) | Full                                                       |
| Admin (campaigns, hop catalog, stock import)         | Full                                                       |
| Visual/UX (desktop 1440)                             | Full                                                       |
| Visual/UX (mobile DOM analysis)                      | Full                                                       |
| Accessibility                                        | Full (DOM-based)                                           |
| Production build smoke                               | Full (previous session, 5/5 pages 200, 0 hydration errors) |

---

## 4. Findings Log

---

### F-001 — Suspend/reject does not block authentication

**Severity:** Critical  
**Category:** Functional / Security / Permissions  
**Roles:** admin (action), any customer (affected)  
**Component:** `apps/backend/src/workflows/steps/set-auth-identity-disabled.ts`

**Reproduction:** Call `POST /admin/members/{id}/suspend`. Then call `POST /auth/customer/emailpass` with the suspended customer's credentials. Response: HTTP 200 with valid JWT.

**Expected:** Login should fail with 401 after suspension.

**Actual:** Login succeeds. The suspension is cosmetic — the customer retains full store API access.

**Why it matters:** Any "ban" operation is non-functional. A fraudulent, abusive, or age-non-compliant customer who is suspended can continue to shop and place orders. Reject has the same failure.

**Root cause:** `setAuthIdentityDisabledStep` calls `authModule.updateAuthIdentities({ id, provider_metadata: {disabled: true} })`. However, `auth_identity` has no `provider_metadata` column — that column exists on `provider_identity`. The write is silently discarded. Medusa's emailpass provider checks `provider_identity.provider_metadata.disabled` at login time; since this value is never set, login always succeeds.

**Fix:** In `set-auth-identity-disabled.ts`, call `authModule.listProviderIdentities({ auth_identity_id: identity.id })` and then `authModule.updateProviderIdentities({ id: pi.id, provider_metadata: { ...pi.provider_metadata, disabled } })`.

**Systemic:** Same bug affects reject AND the disabled:false call in reactivate (which therefore never needed to do anything, since nothing was disabled).

---

### F-002 — Delivery checkout blocked at shipping step

**Severity:** Critical  
**Category:** Functional  
**Roles:** Approved member  
**URL:** `/checkout?step=shipping`

**Reproduction:** Add item to cart. Start checkout with Home Delivery selected. Complete address. On shipping step, select any rate. Click "Proceed to Payment". Page does not advance. Shipping remains "—" in order summary.

**Expected:** Selecting a shipping rate and clicking Proceed should call `setShippingMethod` and navigate to `?step=payment`.

**Actual:** Step never advances. Cart's shipping field stays empty. Delivery orders cannot be completed.

**Why it matters:** Every delivery order is blocked. Only pickup orders can be placed. This is a complete checkout regression for the primary fulfilment type.

**Root cause:** Unknown from current evidence — requires code inspection of `step-shipping/index.tsx` `handleContinue` logic. Prior sessions identified a `router.refresh()` + `router.push()` race condition in the Site-Build repo; confirm whether the same issue exists in HandG.

---

### F-003 — PDP shows guest/unapproved state to logged-in approved member

**Severity:** Critical  
**Category:** Functional / Permissions  
**Roles:** Approved member  
**URL:** `/products/[handle]`

**Reproduction:** Log in as approved member. Navigate to any product PDP.

**Expected:** Price, Add-to-Cart, Technical Specs, and Wishlist panel visible.

**Actual:** Page shows "Trades are available to approved members only." with "APPLY FOR MEMBERSHIP" CTA. No price, no Add-to-Cart, no specs. Identical to guest view.

**Why it matters:** The core shopping action is completely inaccessible to logged-in members from the PDP. Members who navigate directly to a product URL cannot buy anything.

**Root cause:** `canSeePricing` is false when the PDP renders despite the user being authenticated. Either: (1) the customer session is not being read correctly in the RSC that renders the PDP (stale cookie, missing `retrieveCustomer` call, or auth state not propagated), or (2) the `approved@example.test` seed account has incorrect group membership. Needs code-level investigation.

**Note:** This issue did not reproduce for the `qa-approved@hg-test.dev` account in prior sessions but did for `approved@example.test`. This may indicate the seed account's group assignment is incorrect.

---

### F-004 — Price alert SET button permanently disabled

**Severity:** Critical  
**Category:** Functional  
**Roles:** Approved member  
**Component:** Wishlist Management Panel, `/products/[handle]`

**Reproduction:** On a PDP (as approved member), enable "Alert me at Price" toggle. Price input appears. Type any value. SET button remains disabled and unclickable.

**Expected:** SET button enables after a valid price is entered; clicking saves the target price alert.

**Actual:** SET button has `disabled` attribute regardless of input value. Input accepts text but SET button never enables.

**Why it matters:** Price alert feature is completely non-functional for users. No workaround.

**Root cause:** The React state handler for the price input is likely not triggering on native DOM value mutations (DOM manipulation bypasses React's synthetic event system). The component uses `onChange` for enablement logic. Fix: ensure the input uses a React-controlled component pattern; test with a proper user-typed interaction.

---

### F-005 — Pending user has full shopping access (no restriction on PDP)

**Severity:** Critical  
**Category:** Permissions / Security  
**Roles:** Pending member  
**URL:** `/products/[handle]`

**Reproduction:** Log in as `pending@example.test`. Navigate to any product PDP.

**Expected:** "Application Pending" message/blocker shown. No price, no Add-to-Cart.

**Actual:** Price visible (A$55.00), "ADD TO CART" button active, Wishlist Management Panel shown. Pending user has identical access to an approved member.

**Why it matters:** Pending users are not approved members. They should not be able to purchase products. This is both a business integrity issue and a potential age-verification bypass (pending users have submitted their DOB but have not been approved).

**Root cause:** `canSeePricing` check likely uses `isApprovedMember(membershipStatus)` which may not correctly handle the `pending` group. If the pending user's `membershipStatus` resolves to something other than `"pending"` (e.g. falls through to `"approved"`) this gate would fail. Requires code-level verification.

---

### F-006 — /account/vip, /account/wishlist, /account/referrals show "Nothing here." to guests

**Severity:** High  
**Category:** UX / Permissions  
**Roles:** Guest  
**URLs:** `/account/vip`, `/account/wishlist`, `/account/referrals`

**Reproduction:** Navigate directly to any of these URLs without authentication.

**Expected:** Login form shown (same as `/account`), or redirect to `/account` with a return URL.

**Actual:** "Nothing here." not-found page rendered. No navigation header/footer. No login CTA. User is stranded.

**Why it matters:** Users sharing referral links, bookmark users, direct-link traffic — all hit a dead end with no way to authenticate.

**Root cause:** These sub-routes use client component rendering with implicit auth checks but no server-side redirect. The `@login` parallel slot is only wired at the `/account` level, not at sub-route level.

**Fix:** Add server-side `redirect('/account')` to each affected sub-route when `retrieveCustomer()` returns null.

---

### F-007 — /cart and /checkout as guest: silent redirect with no message

**Severity:** High  
**Category:** UX  
**Roles:** Guest  
**URLs:** `/cart`, `/checkout`

**Reproduction:** Navigate directly to `/cart` or `/checkout` without authentication.

**Expected:** A clear message: "Please sign in to continue" with a login link and return URL.

**Actual:** Silent redirect to `/` (homepage) with no explanation. Inconsistent: both redirect to the same place but the user has no idea why.

**Why it matters:** Users following bookmarks, shared cart links, or returning from checkout abandonment get dumped on the homepage with zero context.

**Fix:** In middleware, redirect to `/account?redirect_to=<original-path>` with a flash message explaining why.

---

### F-008 — Admin buy-at-price approval modal cannot be closed

**Severity:** High  
**Category:** Functional / Admin  
**Roles:** Admin  
**URL:** `/app/buy-at-price`

**Reproduction:** Select a pending offer. Click "Review & approve 1". Modal opens. Click Cancel, or press Escape, or click ✕.

**Expected:** Modal closes.

**Actual:** Modal does not close via any of these interactions. Admin is trapped until they navigate away from the page.

**Why it matters:** Any accidental modal open requires a page reload, breaking admin workflow.

---

### F-009 — Buy-at-price counter-offer accepts $0 and negative prices

**Severity:** High  
**Category:** Functional / Data integrity  
**Roles:** Admin  
**Component:** `apps/backend/src/app/admin/routes/buy-at-price/page.tsx` + `approveWishlistOffersWorkflow`

**Reproduction:** Open buy-at-price approval modal. Set counter-offer to 0. "Approve all" button remains enabled.

**Expected:** $0 price blocked with an error message; Approve all disabled until valid price > 0 entered.

**Actual:** No front-end guard. No back-end guard (`offer_price == null` check in route passes for 0). A $0 approval on a $30 product creates a `value:30` discount promotion — customer receives product free.

**Why it matters:** An admin typo or accidental $0 approval gives away stock for free. No confirmation step catches this.

**Fix:** Add `min="0.01"` and client-side validation; add `if (a.offer_price <= 0) throw new MedusaError(...)` in the approval route.

---

### F-010 — Heat-hold toggle fires without confirmation

**Severity:** High  
**Category:** Admin Safety  
**Roles:** Admin  
**URL:** `/app/shipping`  
**Component:** `apps/backend/src/app/admin/routes/shipping/page.tsx:162`

**Reproduction:** Click the "Heat-hold enabled" toggle.

**Expected:** Confirmation dialog: "Enable heat-hold? This will block ALL shipments site-wide."

**Actual:** Toggle fires immediately via `onCheckedChange={(v) => patch(k, v)}`. No dialog.

**Why it matters:** A single misclick blocks all outgoing shipments globally. Description text reads: "When ON, all shipments are blocked." The severity warrants at minimum a confirmation step and ideally a hard confirmation with a type-to-confirm mechanism.

---

### F-011 — Reactivate member fires without confirmation

**Severity:** High  
**Category:** Admin Safety  
**Roles:** Admin  
**URL:** `/app/members`

**Reproduction:** Open a suspended member's drawer. Click "Reactivate."

**Expected:** Confirmation dialog (symmetric with Suspend which does show a dialog).

**Actual:** Reactivate executes immediately. Member group changes instantly. No dialog.

**Root cause from code:** `if (action !== "reactivate") showPrompt(...)` — the reactivate action is explicitly excluded from the confirmation flow.

---

### F-012 — Brewery card click on /breweries does not navigate

**Severity:** High  
**Category:** Functional  
**Roles:** All  
**URL:** `/breweries`

**Reproduction:** Navigate to `/breweries`. Click any brewery card.

**Expected:** Navigation to `/breweries/[slug]`.

**Actual:** Click has no effect. URL remains `/breweries`. Direct URL navigation to `/breweries/brujos-brewing` works.

**Why it matters:** The entire browse-by-brewery user journey is broken via the primary UI entry point. Users who don't know to type the URL directly cannot access brewery pages.

---

### F-013 — Address modal (account/addresses) Cancel button non-functional

**Severity:** High  
**Category:** Functional  
**Roles:** Approved member  
**URL:** `/account/addresses`

**Reproduction:** Click "Add New Address". In the modal, click "Cancel".

**Expected:** Modal closes.

**Actual:** Modal stays open. Cancel and close button (×) both fail to dismiss.

---

### F-014 — Profile page has no password change section

**Severity:** High  
**Category:** Functional  
**Roles:** Approved member  
**URL:** `/account/profile`

**Reproduction:** Navigate to `/account/profile`. Look for password change.

**Expected:** A section to change password (as documented in Sprint 11: POST /store/customers/me/password endpoint exists in the backend).

**Actual:** Profile page shows only name, email, phone, billing address. No password section.

**Why it matters:** The backend endpoint for password change was implemented but the frontend UI is either missing or accessible from a different location that was not discoverable.

---

### F-015 — New Arrivals carousel chevrons are non-functional dead code

**Severity:** High  
**Category:** Functional / UX  
**Roles:** All  
**Component:** `apps/storefront/src/modules/home/components/new-arrivals/index.tsx:70-76`

**Reproduction:** On homepage, click the NEXT (→) or PREV (←) carousel chevron.

**Expected:** Carousel rail scrolls to reveal more/previous cards.

**Actual:** Buttons receive visual feedback (active state) but `scrollLeft` remains 0. No scroll handler is attached.

**Why it matters:** Dead buttons are actively misleading. Users click a clearly interactive element and nothing happens.

---

### F-016 — Admin search persists across member tab switches

**Severity:** Medium  
**Category:** UX / Admin  
**URL:** `/app/members`

**Reproduction:** Search for "approved" in the members list. Switch to the Suspended tab.

**Expected:** Search clears on tab change; Suspended tab shows all suspended members.

**Actual:** "approved" search filter persists. Suspended tab shows "No members in this view" even though suspended members exist.

---

### F-017 — Apply form has no character counter on why_join

**Severity:** Medium  
**Category:** UX / Forms  
**URL:** `/apply`

**Reproduction:** Type in the "why_join" textarea. Approach and exceed 2000 characters.

**Expected:** Character counter showing current/max (e.g. "1950/2000"). Warning near limit. Hard stop at 2000 or clear error.

**Actual:** No `maxLength` attribute on textarea. No counter. No client-side limit. Over-long text is only caught at the server level after form submission.

---

### F-018 — Referral code format only validated server-side

**Severity:** Medium  
**Category:** UX / Forms  
**URL:** `/apply`

**Reproduction:** Enter "!@#" as referral code and submit form.

**Expected:** Instant client-side validation error before submit.

**Actual:** Form submits, shows "Submitting..." state, then server returns error. No client-side regex check.

---

### F-019 — Hop pills on PDP have no tooltip on hover

**Severity:** Medium  
**Category:** Functional / UX  
**URL:** `/products/[handle]` (member view)

**Reproduction:** Hover over a hop pill (e.g. "Citra") in Technical Specs.

**Expected:** Tooltip showing hop description/profile (as implemented in `/hops/[slug]` form chips).

**Actual:** No tooltip. Hop pills are plain links to `/hops/[slug]`.

---

### F-020 — Admin buy-at-price shows "Current: —" for all products

**Severity:** Medium  
**Category:** Admin / UX  
**URL:** `/app/buy-at-price`

**Reproduction:** Open approval dialog for any pending offer.

**Expected:** Current market price displayed so admin can compare against offer price.

**Actual:** "Current" column shows "—" for all entries. Discount column also blank. Admin approves blind without knowing the product's current price.

---

### F-021 — Admin insights: "PENDING APPLICATIONS: 55" contradicts Members page

**Severity:** Medium  
**Category:** Data / Admin  
**URL:** `/app/insights`

**Observation:** Insights shows "55 pending applications" but Members page Pending tab shows 0. Stale or incorrectly calculated metric.

---

### F-022 — No skip navigation link [WCAG 2.4.1 — Level A]

**Severity:** High  
**Category:** Accessibility  
**Roles:** All  
**WCAG:** 2.4.1 Bypass Blocks (Level A)

Every page lacks a skip navigation link. Keyboard users must tab through 7+ nav items on every page load to reach main content. This is a Level A (mandatory) WCAG failure.

**Fix:** Add `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to main content</a>` as the first element in `<body>`, and `id="main-content"` on the `<main>` element.

---

### F-023 — No focus indicators on nav links [WCAG 2.4.7]

**Severity:** High  
**Category:** Accessibility  
**Roles:** All  
**WCAG:** 2.4.7 Focus Visible

Nav links and many interactive elements have `outline: none` (computed). The mobile nav button has an explicit `focus:outline-none` Tailwind class. Sighted keyboard users cannot determine which element is focused.

**Fix:** Remove `focus:outline-none` from interactive elements. Add a consistent focus ring using `focus-visible:ring-2 focus-visible:ring-hg-gold` (or similar brand token) globally via `@layer base`.

---

### F-024 — Apply form inputs have no accessible labels [WCAG 1.3.1, 3.3.2]

**Severity:** Critical  
**Category:** Accessibility  
**WCAG:** 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions

All 8 inputs: no `id`, no `<label for="">`, no `aria-label`, no `aria-labelledby`. Screen readers cannot announce field names. Additionally, no `autocomplete` tokens on any field.

---

### F-025 — Hamburger button has no accessible name [WCAG 4.1.2]

**Severity:** High  
**Category:** Accessibility  
**WCAG:** 4.1.2 Name, Role, Value

`button[data-testid="nav-menu-button"]` contains only an unlabelled SVG. No `aria-label`, no `title`, no text. Also lacks `aria-controls` and `aria-expanded` does not point to the controlled element.

---

### F-026 — Multiple nav elements without aria-label [WCAG 1.3.1]

**Severity:** High  
**Category:** Accessibility  
**WCAG:** 1.3.1 Info and Relationships

Three `<nav>` elements exist (desktop nav, mobile nav, possibly footer) with no `aria-label`. Screen reader landmark navigation cannot distinguish them.

---

### F-027 — Product images use non-descriptive alt="Thumbnail" [WCAG 1.1.1]

**Severity:** High  
**Category:** Accessibility  
**WCAG:** 1.1.1 Non-text Content

All product image `<img>` tags use `alt="Thumbnail"` regardless of product. Screen readers announce "Thumbnail" for every product image instead of the product name.

**Fix:** Set `alt={product.title}` or `alt={product.title + " by " + brewery}`.

---

### F-028 — Empty product image links (duplicate tab stops) [WCAG 2.4.4]

**Severity:** High  
**Category:** Accessibility  
**WCAG:** 2.4.4 Link Purpose

Each product card has two `<a>` tags to the same URL: one wrapping the image (no text, no aria-label) and one for the product name. Creates double tab stops per card; image link is announced as raw URL.

**Fix:** Make the image `<a>` `aria-hidden="true"` and `tabindex="-1"`, keeping only the text link as the focusable element.

---

### F-029 — Heading structure skips levels on multiple pages [WCAG 1.3.1]

**Severity:** High  
**Category:** Accessibility  
**Pages:** `/store` (H3 before H1), `/products/[handle]` (H1→H3, H2→H4), `/apply` (H1→H4)

Multiple pages have illogical heading sequences. Screen reader users who navigate by heading cannot build a reliable document outline.

---

### F-030 — Footer icon links have no accessible name [WCAG 2.4.4]

**Severity:** High  
**Category:** Accessibility  
**Component:** Footer

Three footer links (home, Instagram, email) contain only SVG icons with no text content, `aria-label`, or `title`. Announced as raw URLs or silently omitted.

---

### F-031 — TrustBar dead component (never rendered)

**Severity:** Low  
**Category:** Content  
**Component:** `modules/home/components/trust-bar/index.tsx`

A `TrustBar` component with 4 trust signals exists but is not imported in `app/(main)/page.tsx`. The homepage has no trust-signal content. Either the component should be rendered or the dead code should be deleted.

---

### F-032 — Homepage hero "Apply for Membership" shown to logged-in members

**Severity:** High  
**Category:** UX / Visual  
**Roles:** Approved member  
**URL:** `/`

**Observation:** The homepage hero renders the guest state ("Apply for Membership") even for authenticated approved members. The compact authenticated-hero variant with "New Drops / Low Stock" links does not appear.

**Root cause:** The hero component likely reads `canSeePricing` but the session is not yet resolved at the RSC render time, or a hydration race condition causes the hero to snap back to guest state.

---

### F-033 — Currency prefix inconsistency ("A$" vs "$")

**Severity:** Low  
**Category:** Visual / Content  
**Instances:**

- PDP main price: A$55.00 ✓
- "Members Also Bought" cards: $55.00 ✗
- Wishlist card prices: $55.00 ✗
- Admin buy-at-price current prices: — (blank)

All member-facing prices should display "A$" prefix consistently for the AU region.

---

### F-034 — Button border-radius inconsistent across the app

**Severity:** Low  
**Category:** Visual / Design system  
**Instances:**

- Hero CTA: 12px radius
- Nav "Apply" button: 4px radius
- "Copy link" (referrals): 8px radius
- Apply form submit: 12px radius

Three different values for similar-tier primary/secondary buttons. The nav Apply button's sharp 4px radius is particularly jarring next to rounded elements.

---

### F-035 — Product count text too small and low-contrast

**Severity:** Medium  
**Category:** Visual / UX  
**URL:** `/store`

"14 releases found" counter is 12px uppercase in `rgb(126,137,130)` — barely visible. Users cannot readily confirm their filter results.

---

### F-036 — Filter panel uses 3 incompatible UI patterns

**Severity:** Medium  
**Category:** Visual / UX / Design  
**URL:** `/store`

Three input patterns within a single sidebar:

1. Checkboxes (Brewery, Freshness)
2. Pill chips/toggles (Hop Origin)
3. AND/OR text toggle (Hops)

Users must context-switch between interaction models in the same component.

---

### F-037 — Mobile bottom nav shows Cart + Account to guest users

**Severity:** Medium  
**Category:** UX / Consistency  
**Roles:** Guest, mobile  
**Component:** `mobile-bottom-nav/index.tsx`

Desktop nav correctly hides Cart for guests. Mobile bottom nav shows all 5 tabs (including Cart and Account) to all users. Tapping Cart as a guest silently redirects to homepage with no message.

---

### F-038 — Mobile bottom nav tabs below 44px touch target

**Severity:** Medium  
**Category:** Accessibility / Mobile  
**WCAG:** 2.5.8 Target Size  
**Measurement:** ~36px computed height. WCAG 2.5.8 minimum: 44px.

---

### F-039 — Apply form first/last name grid doesn't collapse on mobile

**Severity:** Low  
**Category:** Visual / Mobile  
**Viewport:** 390px

`grid-cols-2` layout gives each name field ~131px at 390px effective width. Tight but functional; no collapse to single column.

---

### F-040 — Dark mode toggle 36×36px touch target

**Severity:** Low  
**Category:** Accessibility / Mobile  
**WCAG:** 2.5.8 Target Size

`w-9 h-9` = 36×36px. Below 44px WCAG 2.5.8 minimum. Present on all pages.

---

### F-041 — "Members Only" label inconsistency: text-only on homepage, lock icon on /store

**Severity:** Low  
**Category:** Visual / Design consistency

Homepage New Arrivals cards show "Members Only" as plain text. Store cards show lock icon + "Members Only". The restriction should be visually communicated consistently.

---

### F-042 — VIP progress bar near-invisible at 0%

**Severity:** Cosmetic  
**Category:** Visual  
**URL:** `/account/vip`

The VIP progress bar at 0% is a 1–2px green line on a dark background. Barely distinguishable from the container edge. Minimum bar height should be 4px.

---

### F-043 — Referral code "APP-" prefix reads as application number

**Severity:** Low  
**Category:** UX / Copy  
**URL:** `/account/referrals`

Code "APP-F80BAD" — the "APP-" prefix is ambiguous and reads as an application reference rather than a referral invite code. Recipients may question validity.

---

### F-044 — Search input has no accessible label [WCAG 1.3.1]

**Severity:** Medium  
**Category:** Accessibility  
**WCAG:** 1.3.1

The inline search input uses only `placeholder="Search collection..."`. Placeholder is not an accessible name.

---

### F-045 — Hero uses raw `<img>` not `next/image`

**Severity:** Low  
**Category:** Performance  
**Component:** `modules/home/components/hero/index.tsx:57`

No responsive sizing, no lazy load, no format optimization. Should use `<Image>` from next/image.

---

### F-046 — Site Config Revert fires without confirmation

**Severity:** Medium  
**Category:** Admin Safety  
**URL:** `/app/site-config`

Clicking "Revert" on an overridden config value immediately removes the DB override with no dialog. Silently changes production configuration.

---

### F-047 — Campaign Expire and Activate have no confirmation dialogs

**Severity:** Medium  
**Category:** Admin Safety  
**URL:** `/app/campaigns`

Expire and Activate fire immediately. A misclick can silently expire a live promotion or activate a draft.

---

### F-048 — Hop deactivate has no confirmation dialog

**Severity:** Low  
**Category:** Admin Safety  
**URL:** `/app/catalog`

Deactivating a hop fires immediately. NOTE: In this test, Hops page showed a confirmation dialog ("Deactivate Citra? This hop will be hidden…"). This **contradicts** the code analysis which showed no dialog. The Hops page at `/app/hops` (separate from `/app/catalog`) may have a dialog while `/app/catalog` does not. This requires re-verification.

---

### F-049 — No add-to-cart toast notification

**Severity:** Low  
**Category:** UX

After Add-to-Cart, only the cart badge count updates and the button shows "ADDING…". No toast/notification confirms success. Users must check the cart badge to verify the item was added.

---

### F-050 — Product images absent throughout (all placeholder)

**Severity:** Medium  
**Category:** Visual / Content

All product images display `/placeholder-can.jpg` (a single stock image reused for every product). No real product photography is seeded. Visual quality assessment of the store, PDP, and recommendations rail is blocked. This is a test-environment data issue, not a code bug.

---

### F-051 — Approve member (single + bulk) has no confirmation dialog

**Severity:** Medium  
**Category:** Admin Safety  
**URL:** `/app/members`

Approving a pending member (single or bulk) executes immediately with no dialog. Asymmetric: Reject and Suspend both have dialogs; Approve does not.

---

### F-052 — placeholder-can.jpg uses unconfigured quality value

**Severity:** Low  
**Category:** Performance / Config

`placeholder-can.jpg` uses `quality="50"` which is not in `next.config.js → images.qualities`. This will become a hard error in Next.js 16.

---

### F-053 — VIP lock overlay gives no path to upgrade from card

**Severity:** Low  
**Category:** UX

Locked product cards show "AVAILABLE TO VIP2 AND ABOVE" + countdown but no link to the VIP page or any explanation of how to earn VIP status. Users with low tier cannot discover the upgrade path from the store grid.

---

### F-054 — Password show/hide toggle absent from apply form

**Severity:** Medium  
**Category:** UX / Accessibility  
**URL:** `/apply`

Password field has no reveal toggle. Users cannot verify what they typed. Combined with the lack of inline password requirements hint, users face a frustrating UX when their registration fails due to password issues.

---

### F-055 — Ship-from address blur save behavior unclear

**Severity:** Medium  
**Category:** Admin UX  
**URL:** `/app/shipping`

Code analysis shows `onBlur: patch(k, v)` on address fields. This means tabbing away from a field saves immediately without a Save button. Runtime test was inconclusive (no network write observed). If confirmed, accidental tab-out saves uncommitted address changes with no undo.

---

## 5. Systemic Issues

### S-01 — Auth session state does not propagate correctly to RSC components

Multiple findings (F-003, F-032) suggest that after login, some server-rendered components (PDP, homepage hero) render in the guest/unapproved state despite the session being valid. This implies the `retrieveCustomer()` call in the relevant RSC either doesn't fire or its result doesn't reach the conditional rendering component. This is a systemic Next.js 15 RSC + cookies propagation issue, not isolated bugs.

### S-02 — Admin destructive actions lack a consistent confirmation standard

Eight separate admin actions execute without confirmation (F-010, F-011, F-046, F-047, F-051, F-009). The inconsistency is systematic: three actions have `usePrompt` (Reject, Suspend, Campaign Delete) and eight do not. The codebase should establish a rule: every action that is **irreversible**, **global in scope**, or **financially significant** requires a confirmation dialog with clear consequence language.

### S-03 — Accessibility baseline is not enforced

The combination of missing skip navigation (WCAG 2.4.1 Level A), no focus indicators on nav (WCAG 2.4.7), and unlabelled form inputs (WCAG 1.3.1) on the highest-traffic pages suggests no a11y baseline testing or linting is in place. An `axe-core` or `jest-axe` integration would catch these programmatically.

### S-04 — Currency prefix inconsistency ($55.00 vs A$55.00)

AUD currency is displayed inconsistently across 4+ locations. A centralized `formatPrice(amount, currencyCode)` utility should be the single source of formatting truth throughout the app.

### S-05 — Dead code accumulation

TrustBar component (never rendered), New Arrivals chevrons (no handler), `untappd_id` field (collected but no input), `password` field excluded from register validator. Dead code should be removed to reduce maintenance overhead.

---

## 6. Priority Fix Order

### P0 — Fix before any production traffic

1. **F-001** — Auth-disable bug: suspend/reject must actually block login. Simple 2-line fix in `set-auth-identity-disabled.ts`.
2. **F-002** — Delivery checkout blocked at shipping step. Critical revenue path broken.
3. **F-003** — PDP shows guest state to logged-in members. Core shopping flow broken.
4. **F-005** — Pending users have full shopping access. Permission violation.

### P1 — Fix before launch

5. **F-022** — Skip navigation (WCAG 2.4.1 Level A). One `<a>` tag.
6. **F-024** — Apply form labels (WCAG 1.3.1). Form is the primary conversion point.
7. **F-023** — Focus indicators. Remove `focus:outline-none` globally.
8. **F-010** — Heat-hold confirmation dialog. One misclick blocks all shipments.
9. **F-009** — Buy-at-price $0 guard. Add `min="0.01"` + server-side validation.
10. **F-004** — Price alert SET button permanently disabled.
11. **F-012** — Brewery card click doesn't navigate.
12. **F-006** — Account sub-routes show "Nothing here." to guests.
13. **F-013** — Address modal Cancel non-functional.
14. **F-008** — Buy-at-price approval modal cannot be closed.

### P2 — Address in next sprint

15. **F-027** — Product images `alt="Thumbnail"` → use product name.
16. **F-025** — Hamburger button accessible name.
17. **F-026** — Multiple nav elements without aria-label.
18. **F-029** — Heading structure skips on multiple pages.
19. **F-028** — Empty product image links (double tab stops).
20. **F-030** — Footer icon links no accessible name.
21. **F-032** — Homepage hero shows guest state to members.
22. **F-037** — Mobile bottom nav guest tab gating.
23. **F-038** — Bottom nav 36px touch targets → 44px minimum.
24. **F-033** — Currency prefix standardization.
25. **F-007** — Cart/checkout redirect with no message.
26. **F-011** — Reactivate confirmation dialog.
27. **F-014** — Profile page password change section.
28. **F-051** — Approve member confirmation dialog.

### P3 — Polish and continuous improvement

29. **F-034** — Button border-radius design token consistency.
30. **F-035** — Product count text visibility.
31. **F-036** — Filter panel UI pattern consistency.
32. **F-044** — Search input accessible label.
33. **F-054** — Password show/hide + requirements hint.
34. **F-052** — next/image quality config.
35. **F-031** — TrustBar (render or delete).
36. **F-015** — New Arrivals chevrons (wire or remove).
37. **F-042** — VIP progress bar min height.
38. **F-043** — Referral code prefix naming.
39. **F-053** — VIP lock upgrade path hint on card.
40. **F-049** — Add-to-cart success toast.

---

## 7. Open Questions

1. **F-003 / F-032 root cause:** Is the `approved@example.test` account's group assignment correct? Or is the RSC session read failing for some accounts? Repro with `qa-approved@hg-test.dev` to isolate.
2. **F-005 root cause:** Does `isApprovedMember()` correctly handle `pending` group, or does the `pending` user have incorrect group assignment in the DB?
3. **F-002 root cause:** Is this the `router.refresh()` + `router.push()` race condition from the Site-Build repo? Or a different regression?
4. **F-014 location:** Is the password change UI somewhere other than `/account/profile`? Was it intentionally excluded from the seeded test account build?
5. **F-037 intent:** Is the mobile bottom nav showing Cart/Account to guests intentional (as it mirrors mobile app patterns) or an oversight?
6. **F-048 status:** Does the Hops page (`/app/hops`) have a deactivation dialog or not? Code analysis and runtime disagreed.
7. **F-055 ship-from address:** Is onBlur auto-save intentional UX or an implementation artifact?
8. **F-021 discrepancy:** Why does Insights show 55 pending applications when Members page shows 0? Which source is authoritative?
9. **Price change feature location:** If `/account/profile` doesn't have password change, where is it? Is there a separate route?

---

## Appendix A: Prior hypotheses — confirmed/refuted/new

| Hypothesis                                            | Result                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Index Engine count desync (F1 from prior audit)       | UPDATED — Not an Index Engine bug; caused by client-side release_at filter reducing visible count |
| Guest prices/ABV stripped at API                      | CONFIRMED — Verified: no abv key, calculated_price:null for guest                                 |
| /cart + /checkout silent redirect                     | CONFIRMED — F-007                                                                                 |
| /account/vip shows "Nothing here." to guests          | CONFIRMED — F-006                                                                                 |
| Mobile bottom nav shows Cart+Account to guest         | CONFIRMED — F-037                                                                                 |
| Auth-disable bug (suspend/reject doesn't block login) | CONFIRMED — F-001                                                                                 |
| Admin Reactivate no confirmation                      | CONFIRMED — F-011                                                                                 |
| Heat-hold no confirmation                             | CONFIRMED — F-010                                                                                 |
| Buy-at-price $0 no guard                              | CONFIRMED — F-009                                                                                 |
| Site config revert no confirmation                    | CONFIRMED — F-046                                                                                 |
| DialogContent missing DialogTitle (2 instances)       | CONFIRMED — referenced in console errors                                                          |
| F2/F3/F4 hydration errors dev-only                    | CONFIRMED — production build was clean in prior session                                           |
| VIP scoring bug (payment_status)                      | REFUTED — fixed in calculate-vip-score.ts                                                         |
| Admin login form rejects .test TLDs                   | REFUTED — no .test TLD rejection in this codebase                                                 |
| New Arrivals chevrons dead                            | CONFIRMED — F-015                                                                                 |
| Hero raw img not next/image                           | CONFIRMED — F-045                                                                                 |
| TrustBar not rendered                                 | CONFIRMED — F-031                                                                                 |
| "Members Only" treatment inconsistency                | CONFIRMED — F-041                                                                                 |

**New findings this run (not in prior audit):**

- F-002: Delivery checkout blocked at shipping step
- F-003: PDP shows guest state to approved members
- F-004: Price alert SET button permanently disabled
- F-005: Pending user has full shopping access
- F-012: Brewery card click doesn't navigate
- F-013: Address modal Cancel non-functional
- F-014: Profile page has no password change UI
- F-029: Heading structure skips (detailed analysis)
- F-032: Homepage hero shows guest state to members
- Full accessibility audit (F-022 through F-030)
