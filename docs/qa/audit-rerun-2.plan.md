# QA Re-Audit Plan — Post-Remediation

## Hops & Glory — June 2026

---

## Execution Rules (Crash-Prevention)

- ZERO `skill()` calls in this plan or during execution
- One browser agent at a time — sequential only
- Each phase runs independently; findings recorded in docs/qa/audit-rerun-2.md
- Pass/Fail recorded per finding ID; reference original audit-full.md for context

---

## Phase 1 — Guest State (Unauthenticated)

**Setup:** Ensure no session cookie. Test at http://localhost:8000

### Tests

- **G-001** — Homepage renders correctly for guest (hero, trust bar visible, no member-only UI leaked)
- **G-002** — Nav shows no Cart or Account link to guest; mobile nav shows "Join" not "Account"
- **G-003** — Store page visible but all products show "Members Only" price guard
- **G-004** — Brewery page accessible; cards are clickable (full card navigates to brewery detail)
- **G-005** — Attempting to access /cart redirects to /account?redirect_to=/cart (not /)
- **G-006** — Attempting to access /checkout redirects to /account?redirect_to=/checkout
- **G-007** — Skip navigation link visible on focus (Tab from browser chrome)
- **G-008** — Search input has accessible label

---

## Phase 2 — Pending Member

**Setup:** Log in as pending@example.test (use login form at /account)

### Tests

- **P-001** — After login, hero shows pending state (not approved member welcome)
- **P-002** — Store page shows "Members Only" guard on products (not full pricing)
- **P-003** — Pending banner visible at top of page
- **P-004** — /account/wishlist redirects to /account?redirect_to=/account/wishlist
- **P-005** — /account/referrals redirects to /account?redirect_to=/account/referrals
- **P-006** — /account/vip redirects to /account?redirect_to=/account/vip

---

## Phase 3 — Approved Member

**Setup:** Log in as approved@example.test (approved group, not pending/suspended)

### Tests

- **A-001** — Homepage hero shows approved member welcome (not guest or pending state)
- **A-002** — Store page shows full pricing and add-to-cart buttons
- **A-003** — Add to cart shows toast notification "Added to cart"
- **A-004** — Cart page accessible
- **A-005** — Checkout flows through: fulfilment → address → shipping → shipping rates load → Proceed to Payment
- **A-006** — Account profile page shows Password section (change password form visible)
- **A-007** — Account wishlist page loads without redirect
- **A-008** — Account referrals page loads without redirect
- **A-009** — /account/vip loads without "Nothing here" (shows VIP score dashboard)
- **A-010** — Brewery card click (on outer area, not social icons) navigates to brewery detail
- **A-011** — Brewery social icon (website/instagram) opens external link, does NOT navigate away from card
- **A-012** — New arrivals carousel prev/next chevrons scroll the product list
- **A-013** — Apply form has labelled inputs (check with browser accessibility inspector)
- **A-014** — Mobile nav (resize to mobile) shows Cart tab for approved member
- **A-015** — Currency displays as "$X" not "A$X" for AUD prices

---

## Phase 4 — VIP Member

**Setup:** Log in as vip@example.test (vip3 group)

### Tests

- **V-001** — VIP page at /account/vip shows tier progress bar (visible, not invisible at 0%)
- **V-002** — Products with early access restriction show VIP lock with "View your VIP progress →" link
- **V-003** — Hop pills on PDP have tooltip on hover (title attribute)

---

## Phase 5 — Admin Flows

**Setup:** Log in to http://localhost:9000/app as admin

### Tests

- **AD-001** — Members page: clicking Approve on a pending member shows confirmation dialog before action
- **AD-002** — Members page: clicking Suspend shows confirmation dialog with "danger" variant
- **AD-003** — Members page: clicking Reactivate now shows confirmation dialog (was previously skipping)
- **AD-004** — Members page: switching tabs clears the search input
- **AD-005** — Buy-at-Price page: price inputs show "Current: $X" (not "Current: —")
- **AD-006** — Buy-at-Price page: approve modal Cancel button is always enabled (not disabled during saving)
- **AD-007** — Buy-at-Price page: approving with $0 price shows validation error
- **AD-008** — Shipping page: enabling heat hold shows danger confirmation dialog
- **AD-009** — Site Config page: clicking Revert on any config key shows confirmation dialog
- **AD-010** — Campaigns page: clicking Expire or Activate shows confirmation dialog
- **AD-011** — Insights page: PENDING APPLICATIONS count matches Members page pending count

---

## Phase 6 — Auth Security

**Setup:** Admin credentials needed. Test auth-disable workflow.

### Tests

- **S-001** — Suspend approved@example.test via admin Members page → verify suspended account cannot log in
- **S-002** — Reactivate the account → verify login works again
- **S-003** — After test, confirm approved@example.test is back in approved group

---

## Phase 7 — Accessibility & Visual Polish

**Setup:** Guest and approved member sessions. Use browser accessibility tools.

### Tests

- **AX-001** — Focus ring visible on nav links when using keyboard (Tab navigation)
- **AX-002** — Skip navigation link appears on first Tab and jumps to main content
- **AX-003** — Hamburger/menu button has accessible name "Open navigation menu"
- **AX-004** — Footer social icon links have accessible names
- **AX-005** — Product thumbnail images have meaningful alt text (not "Thumbnail")
- **AX-006** — Homepage renders TrustBar between hero and New Arrivals
- **AX-007** — Hero image uses next/image (check network tab: no raw /images/hero-bg.jpg direct load)
- **AX-008** — Mobile nav touch targets are ≥44px (inspect element)
- **AX-009** — Apply form character counter shows for "Why do you want to join?" field

---

## Output

Results to be compiled in: `docs/qa/audit-rerun-2.md`

Format per finding:

```
| ID | Description | Result | Notes |
```

Summary counts: Total / Pass / Fail / Skip
