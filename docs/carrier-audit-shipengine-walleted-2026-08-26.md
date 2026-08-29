# ShipEngine/ShipStation API — Walleted Carrier Audit

**Date:** 2026-08-26  
**Persona:** Investigator (read-only public research)  
**Source:** ShipStation API Developer Docs (next.js chunks extracted from https://www.shipengine.com/docs/)  
**Build ID used:** `Qlm2VuuRG5Hq8i1pqDDsN` (current as of audit date)  
**Doc URLs:**

- `https://www.shipengine.com/docs/carriers/aramex-from-shipengine` (walleted)
- `https://www.shipengine.com/docs/carriers/couriersplease-from-shipengine` (walleted)
- `https://www.shipengine.com/docs/carriers/aramex-au` (own account — for contrast)
- `https://www.shipengine.com/docs/carriers/couriersplease-guide` (own account — for contrast)

---

## Summary

Documentation was extracted from the ShipStation API Next.js doc site JS page chunks (the pages themselves require JavaScript rendering and return 404 to curl). All content is drawn directly from those chunks — no inference applied. The two walleted carriers (`aramex_au_walleted` and `couriersplease_walleted`) have meaningfully different requirements and constraints from their corresponding own-account variants; they must not be conflated.

Key differences: Couriers Please walleted has **no return service support** and **only one service code** (`couriersplease_walleted_parcel`), while Aramex walleted does support returns and has four service codes plus a priority code under the legacy `fastway_au_walleted_` prefix. Couriers Please walleted **does** support carrier insurance; Aramex walleted (and own-account) **does not**.

---

## Carrier Requirements Table

| Feature                   | `aramex_au_walleted` (ShipStation-walleted)                                                                                    | `couriersplease_walleted` (ShipStation-walleted)                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Carrier name in API**   | `aramex_au_walleted`                                                                                                           | `couriersplease_walleted`                                                            |
| **Doc path**              | `/carriers/aramex-from-shipengine`                                                                                             | `/carriers/couriersplease-from-shipengine`                                           |
| **Account type**          | ShipStation-managed (no own credentials)                                                                                       | ShipStation-managed (no own credentials)                                             |
| **Account requirement**   | AU-based ShipStation API account; ShipStation Carriers must be activated; positive balance required                            | Same                                                                                 |
| **Ship To phone**         | Not stated as required in walleted doc                                                                                         | Not stated as required                                                               |
| **Ship To email**         | Not stated as required in walleted doc                                                                                         | Not stated as required                                                               |
| **Ship To company**       | Not mentioned                                                                                                                  | **Required** — if left blank, recipient name is printed in Company field             |
| **Ship From phone**       | Not stated as required in walleted doc                                                                                         | Not stated as required                                                               |
| **Ship From email**       | Not stated as required in walleted doc                                                                                         | Not stated as required                                                               |
| **Weight required**       | Not explicitly stated in walleted doc                                                                                          | **Yes — both weight and dimensions required for all shipments**                      |
| **Dimensions required**   | Not explicitly stated in walleted doc                                                                                          | **Yes — both weight and dimensions required for all shipments**                      |
| **Max dimension**         | Satchel dims built in; non-satchel limit not stated in walleted doc (own-account: 105 cm max on any two dimensions)            | Not stated                                                                           |
| **Label format**          | PDF only                                                                                                                       | PDF only                                                                             |
| **Label message**         | Label message 1 supported only                                                                                                 | Label message 1 supported only                                                       |
| **Label branding**        | Supported                                                                                                                      | Supported                                                                            |
| **Paperless labels**      | Not supported                                                                                                                  | Not supported                                                                        |
| **Insurance**             | **Not supported**                                                                                                              | **Supported** (carrier insurance via ShipStation API; see Parcel Insurance page)     |
| **Returns**               | **Supported** — all domestic services                                                                                          | **Not supported** ("does not currently support return services")                     |
| **Delivery confirmation** | `none` (authority to leave), `delivery` (standard/requested), `signature` (signature required)                                 | `none` (authority to leave), `signature` (signature required) — no `delivery` option |
| **Manifests**             | Supported (reference: Manifests & Scan Forms)                                                                                  | **Automatically manifested** (doc states "shipments are automatically manifested")   |
| **Pickups**               | Supported; cities: Brisbane, Melbourne, Sydney, Canberra, Adelaide, Geelong, Gold Coast, Sunshine Coast, Wollongong, Newcastle | Supported                                                                            |
| **Service Points (PUDO)** | Not supported                                                                                                                  | Not supported                                                                        |
| **Advanced options**      | None currently supported                                                                                                       | None currently supported                                                             |
| **Dangerous goods**       | Not documented                                                                                                                 | Not documented (own-account has `dangerous_goods` field; walleted is silent)         |
| **Residential indicator** | Not documented in either walleted or own-account docs                                                                          | Not documented                                                                       |
| **Address validation**    | Not described as a carrier-level feature (platform-level address validation exists separately)                                 | Same                                                                                 |
| **Multi-package**         | Supported                                                                                                                      | Supported                                                                            |
| **Tracking**              | Supported (webhooks + polling)                                                                                                 | Supported                                                                            |
| **International**         | Not documented for walleted                                                                                                    | Not documented for walleted                                                          |

---

## Service Codes

### `aramex_au_walleted` — Services

| Service Name       | API Code                                           |
| ------------------ | -------------------------------------------------- |
| Standard           | `aramex_au_walleted_standard`                      |
| Leave at Door      | `aramex_au_walleted_leave_at_door`                 |
| Signature Required | `aramex_au_walleted_signature_required`            |
| Priority           | **`fastway_au_walleted_priority`** ← legacy prefix |

**Important:** The Priority service uses the `fastway_au_walleted_` prefix, not `aramex_au_walleted_`. This is a legacy naming artifact from the Fastway → Aramex rebrand. The carrier code itself remains `aramex_au_walleted`.

### `aramex_au_walleted` — Package Codes

| Package Name      | API Code                        | Dimensions     | Max Weight |
| ----------------- | ------------------------------- | -------------- | ---------- |
| Package (generic) | `aramex_au_walleted_package`    | custom         | —          |
| Satchel A2        | `aramex_au_walleted_satchel_a2` | 42.0 × 59.4 cm | 5 kg       |
| Satchel A3        | `aramex_au_walleted_satchel_a3` | 29.7 × 42.0 cm | 3 kg       |
| Satchel A4        | `aramex_au_walleted_satchel_a4` | 21.0 × 29.7 cm | 1 kg       |
| Satchel A5        | `aramex_au_walleted_satchel_a5` | 14.8 × 21.0 cm | 500 g      |

Note: Doc states "when using satchels, dimensions and weight are not required as these are factored in on the Aramex side."

---

### `couriersplease_walleted` — Services

| Service Name    | API Code                         |
| --------------- | -------------------------------- |
| Domestic Parcel | `couriersplease_walleted_parcel` |

Only **one service code** is documented for the walleted variant. The own-account variant has ~100+ service codes covering domestic priority, off-peak, gold domestic, road express, satchels, international, etc.

### `couriersplease_walleted` — Package Codes

Only a generic `package` type is referenced in the walleted doc. No predefined package codes (like satchel sizes) are listed for the walleted variant.

---

## Contrast with Own-Account Variants

### Aramex Australia (own-account) — carrier_name: `fastway_au`

- **Ship To phone:** Required
- **Ship To email:** Required
- **Ship From phone:** Required
- **Ship From email:** Required
- **Dimensions:** Required for non-satchel; for non-satchel, no two dimensions may exceed 105 cm
- **Satchel dims/weight:** Not required (factored by carrier)
- **Services:** `fastway_au_standard`, `fastway_au_leave_at_door`, `fastway_au_signature_required`, `fastway_au_priority`
- **Package codes:** `fastway_au_package`, `fastway_au_satchel_a2/a3/a4/a5`, `fastway_au_satchel_300gm`
- **Returns:** Supported for all services **except Priority**
- **Insurance:** Not supported
- **Delivery confirmation:** `none`, `delivery`, `signature`
- **Connection credentials:** `client_id`, `client_secret`, `email`, optional `account-type_id`
- **Label message 1:** Maps to label reference field; special instructions cannot be mapped to a reference field
- **Advanced options:** None

### Couriers Please (own-account) — carrier_name: `couriers_please`

- **Ship To email:** Required for all shipments
- **Ship To phone:** Not stated as required
- **Ship From first+last name:** Required (Ship From address must have both)
- **Weight + dimensions:** Required for all shipments
- **Services:** Extensive (~100+ codes across domestic priority, off-peak, gold domestic, road express variants, satchels, international, returns)
- **Returns:** Supported (`couriers_please_returns`, `couriers_please_returns_pickup`, `couriers_please_returns_drop_off`)
- **International:** SAVW (International Saver), EXPW/EXPI/EXPD (International Express variants)
- **Insurance:** Supported
- **Delivery confirmation:** `none` (no authority to leave), `signature`
- **Advanced options:** `dangerous_goods` (boolean, default false)
- **Manifests:** Supported
- **PUDO/Service Points:** Drop-off services support service points
- **Multi-package:** Supported for "kilo" and "base" rate types; "item" rate type = single package only
- **Connection credentials:** `account_number`, `api_secret`; optional: `add_ship_date_during_label_creation`, `skip_rating_during_label_creation`

---

## Risks

| Risk                                                                                                                 | Likelihood                     | Impact                                                      |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `fastway_au_walleted_priority` prefix inconsistency causes label failures if using `aramex_au_walleted_priority`     | High                           | High — returns 400/service-not-found                        |
| `couriersplease_walleted` returns attempted at API level fail silently or return error                               | High                           | Medium — no return label capability at all for this variant |
| Sending dimensions/weight for `aramex_au_walleted` satchels when it's not required may cause unexpected behavior     | Low                            | Low                                                         |
| Phone/email fields omitted for own-account Aramex AU (`fastway_au`) shipments cause validation failure               | High if switched from walleted | High                                                        |
| Insurance request on `aramex_au_walleted` silently ignored or returns error                                          | Medium                         | Medium                                                      |
| Automatic manifesting on `couriersplease_walleted` means manual manifest calls may be unnecessary or double-manifest | Medium                         | Low-Medium                                                  |

---

## Gaps (could not determine from public docs)

1. **Weight limits for non-satchel shipments on `aramex_au_walleted`** — the walleted doc does not state a maximum weight for the generic `aramex_au_walleted_package` type; only satchel weights are listed.
2. **Dimensions required for `aramex_au_walleted` non-satchel** — walleted doc does not explicitly state whether weight+dimensions are required (unlike CP walleted which explicitly states they are). The 105 cm per-dimension limit from own-account may or may not apply.
3. **`couriersplease_walleted` package size limits** — no dimension or weight limits documented for `couriersplease_walleted_parcel`.
4. **Residential indicator** — not documented for either carrier (walleted or own-account). No `residential_indicator` field is mentioned anywhere in any of the four carrier doc pages.
5. **Address validation** — no carrier-level address validation feature is documented for these carriers. Platform-level `/v1/addresses/validate` exists but is carrier-agnostic.
6. **`couriersplease_walleted` company name enforcement** — doc says "if left blank, recipient name is displayed in Company field." Not clear if this is an API warning/error or purely a label rendering note.
7. **International support for walleted variants** — neither walleted doc documents international services. The own-account CP guide lists international codes (SAVW, EXPW, EXPI, EXPD). Whether these are accessible via the walleted account is undocumented.
8. **Pickup scheduling granularity** — Aramex walleted lists supported cities but does not specify time windows, cutoffs, or API parameters for pickup scheduling in the public doc.
9. **`fastway_au_walleted_priority` confirmation types** — the Aramex walleted confirmation table shows `none`/`delivery`/`signature` but it's unclear whether Priority service supports all three or is restricted.
10. **Manifest trigger** — `couriersplease_walleted` doc states shipments are "automatically manifested" but does not document whether calling `POST /v1/manifests` is still needed or is a no-op.

---

## Recommendation

**NEEDS_CHANGE** on any integration that:

- Uses `aramex_au_walleted_priority` as the service code — it must be `fastway_au_walleted_priority`
- Attempts return labels via `couriersplease_walleted` — no return service exists for this variant
- Requests insurance via `aramex_au_walleted` — not supported; will fail or be silently dropped
- Omits `company` field for CP walleted ship_to — will produce unexpected label output (recipient name printed in company position)
- Assumes own-account phone/email requirements apply to walleted variants — the walleted docs do not document those requirements; test before enforcing

Verify weight/dimension requirements and manifest behavior for `couriersplease_walleted` directly against the live API, as public docs are incomplete on these points.
