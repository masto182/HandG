# ShipEngine API Field Matrix

**Persona:** Investigator (read-only)
**Date:** 2026-08-26
**Sources:**

- OpenAPI spec: https://raw.githubusercontent.com/ShipEngine/shipengine-openapi/master/openapi.json (canonical, most current)
- JSON schema repo: https://github.com/ShipEngine/shipengine-json-schema/tree/master/requests (detailed nested types, older)
- Both accessed 2026-08-26 via GitHub raw content

**Verdict:** VERIFIED — all three endpoint schemas resolved from authoritative ShipEngine GitHub sources. Two docs inconsistencies recorded (section 5).

---

## Summary

Three endpoints covered: `POST /v1/rates`, `POST /v1/labels`, `POST /v1/labels/rates/{rate_id}`. The OpenAPI spec is the authoritative source; the JSON schema repo is more granular for nested types but shows older enum values. The label-from-rate path accepts only label presentation overrides — all shipment data is frozen at rate time. `ship_from` is **required** for rates but conditionally required for labels (either `ship_from` or `warehouse_id` satisfies the constraint).

---

## 1. POST /v1/rates

**Schema:** `calculate_rates_request_body`
**Source:** openapi.json `#/components/schemas/calculate_rates_request_body`

### Top-level body shape

The body is a **oneOf** (either re-rate an existing shipment by ID, or supply a full shipment) combined with an **allOf** for rate options.

| Field                        | Type           | Status               | Notes                                                                       |
| ---------------------------- | -------------- | -------------------- | --------------------------------------------------------------------------- |
| `shipment_id`                | string (se_id) | oneOf branch A       | Supply to re-rate an existing shipment. Mutually exclusive with `shipment`. |
| `shipment`                   | object         | oneOf branch B       | Full shipment object. See § 1.1. Required if no `shipment_id`.              |
| `rate_options`               | object         | **REQUIRED** (allOf) | See § 1.2. Always required.                                                 |
| `ship_to_service_point_id`   | string         | optional             | Relay/service-point override for destination.                               |
| `ship_from_service_point_id` | string         | optional             | Relay/service-point override for origin.                                    |

**Confidence: high** (directly from OpenAPI `calculate_rates_request_body` schema).

### 1.1 shipment object (address_validating_shipment)

Required when not using `shipment_id`. Schema title: `address_validating_shipment`.

| Field                  | Type               | Status         | Default         | Notes                                                                                                            |
| ---------------------- | ------------------ | -------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `carrier_id`           | string (se_id)     | **REQUIRED**   | —               | Pattern `^se(-[a-z0-9]+)+$`, maxLength 25                                                                        |
| `service_code`         | string             | **REQUIRED**   | —               | Pattern `^[a-z0-9]+(_[a-z0-9-]+)* ?$`                                                                            |
| `ship_to`              | object (address)   | **REQUIRED**   | —               | See § 3.1 for address fields                                                                                     |
| `ship_from`            | object (address)   | **REQUIRED**   | —               | Required for rates (unlike labels). See § 3.2                                                                    |
| `warehouse_id`         | string (se_id)     | optional       | null            | Alternative to `ship_from`. Not used when `ship_from` is set.                                                    |
| `return_to`            | object (address)   | optional       | —               | Overrides return address on label                                                                                |
| `external_shipment_id` | string             | optional       | —               | maxLength: 50; your own reference ID                                                                             |
| `external_order_id`    | string             | optional       | —               |                                                                                                                  |
| `shipment_number`      | string             | optional       | —               | OpenAPI-only field                                                                                               |
| `ship_date`            | string (date-time) | optional       | —               | Format: `YYYY-MM-DDThh:mm:ssZ`. If omitted, defaults to today (carrier-dependent)                                |
| `validate_address`     | string (enum)      | optional       | `no_validation` | `no_validation`, `validate_only`, `validate_and_clean`                                                           |
| `confirmation`         | string (enum)      | optional       | `none`          | `none`, `delivery`, `signature`, `adult_signature`, `direct_signature`, `delivery_mailed`, `verbal_confirmation` |
| `insurance_provider`   | string (enum)      | optional       | `none`          | `none`, `shipsurance`, `carrier`, `third_party`                                                                  |
| `customs`              | object             | cond. required | null            | Required for international shipments. See § 4                                                                    |
| `advanced_options`     | object             | optional       | —               | See § 5                                                                                                          |
| `packages`             | array              | **REQUIRED**   | —               | minItems: 1. See § 3.3                                                                                           |
| `items`                | array              | optional       | `[]`            | Order line items; informational                                                                                  |
| `tax_identifiers`      | array              | optional       | —               | See § 4.1                                                                                                        |
| `order_source_code`    | string (enum)      | optional       | —               | `amazon_ca`, `amazon_us`, `shopify`, `ebay`, etc.                                                                |
| `comparison_rate_type` | string             | optional       | —               | OpenAPI-only field                                                                                               |
| `shipping_rule_id`     | string             | optional       | —               | OpenAPI-only field                                                                                               |
| `is_return`            | boolean            | optional       | false           |                                                                                                                  |

**Confidence: high** (cross-referenced between openapi.json `shipment_request` schema and JSON schema repo `calculate_rates_request_body`).

### 1.2 rate_options object

**Required** at the top level alongside `shipment`/`shipment_id`.

| Field                  | Type                    | Status       | Notes                                                   |
| ---------------------- | ----------------------- | ------------ | ------------------------------------------------------- |
| `carrier_ids`          | array of string (se_id) | **REQUIRED** | minItems: 1. Which carriers to rate against             |
| `service_codes`        | array of string         | optional     | Filter to specific service codes                        |
| `package_types`        | array of string         | optional     | Filter to specific package types                        |
| `calculate_tax_amount` | boolean                 | optional     | Include tax in rate calculation                         |
| `preferred_currency`   | string (enum)           | optional     | `usd`, `cad`, `aud`, `gbp`, `eur`, `nzd`                |
| `is_return`            | boolean                 | optional     | Whether this is a return shipment                       |
| `rate_type`            | string (enum)           | optional     | `check`, `shipment`, `quick`. Type of rating to perform |

**Confidence: high** (openapi.json `rate_request_body` schema).

---

## 2. POST /v1/labels

**Schema:** `create_label_request_body`
**Source:** openapi.json `#/components/schemas/create_label_request_body`

### Top-level body shape

| Field                        | Type           | Status       | Default         | Notes                                                              |
| ---------------------------- | -------------- | ------------ | --------------- | ------------------------------------------------------------------ |
| `shipment`                   | object         | **REQUIRED** | —               | See § 2.1                                                          |
| `validate_address`           | string (enum)  | optional     | `no_validation` | `no_validation`, `validate_only`, `validate_and_clean`. writeOnly. |
| `label_format`               | string (enum)  | optional     | `pdf`           | `pdf`, `png`, `zpl`                                                |
| `label_layout`               | string (enum)  | optional     | `4x6`           | `4x6`, `letter`, `A4`, `A6`                                        |
| `label_download_type`        | string (enum)  | optional     | `url`           | `url`, `inline`                                                    |
| `display_scheme`             | string (enum)  | optional     | `label`         | `label`, `paperless`, `label_and_paperless`                        |
| `label_image_id`             | string         | optional     | —               | Custom label image; minLength: 4                                   |
| `test_label`                 | boolean        | optional     | `false`         | Generates a non-postage test label                                 |
| `is_return_label`            | boolean        | optional     | —               | Create a return label                                              |
| `rma_number`                 | string         | optional     | —               | RMA reference; printed on return label                             |
| `outbound_label_id`          | string (se_id) | optional     | —               | Required when `is_return_label: true`                              |
| `charge_event`               | string (enum)  | optional     | —               | `carrier_default`, `on_creation`, `on_carrier_acceptance`          |
| `ship_to_service_point_id`   | string         | optional     | —               | Relay/service-point for destination                                |
| `ship_from_service_point_id` | string         | optional     | —               | Relay/service-point for origin                                     |

**Confidence: high** (openapi.json `create_label_request_body` schema).

### 2.1 shipment object (shipment_request)

Schema title: `shipment_request`. Note in description: _"Either `ship_from` or `warehouse_id` must be set."_

| Field                  | Type               | Status         | Default | Notes                                                                                                            |
| ---------------------- | ------------------ | -------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `carrier_id`           | string (se_id)     | **REQUIRED**   | —       |                                                                                                                  |
| `service_code`         | string             | **REQUIRED**   | —       |                                                                                                                  |
| `ship_to`              | object             | **REQUIRED**   | —       | See § 3.1                                                                                                        |
| `packages`             | array              | **REQUIRED**   | —       | minItems: 1. See § 3.3                                                                                           |
| `ship_from`            | object             | cond. required | —       | Required unless `warehouse_id` is set. See § 3.2                                                                 |
| `warehouse_id`         | string (se_id)     | cond. required | null    | Required unless `ship_from` is set                                                                               |
| `return_to`            | object             | optional       | —       | See § 3.1 (same address schema)                                                                                  |
| `external_shipment_id` | string             | optional       | —       | maxLength: 50                                                                                                    |
| `external_order_id`    | string             | optional       | —       |                                                                                                                  |
| `shipment_number`      | string             | optional       | —       |                                                                                                                  |
| `ship_date`            | string (date-time) | optional       | —       |                                                                                                                  |
| `is_return`            | boolean            | optional       | `false` |                                                                                                                  |
| `confirmation`         | string (enum)      | optional       | `none`  | `none`, `delivery`, `signature`, `adult_signature`, `direct_signature`, `delivery_mailed`, `verbal_confirmation` |
| `insurance_provider`   | string (enum)      | optional       | `none`  | `none`, `shipsurance`, `carrier`, `third_party`                                                                  |
| `customs`              | object             | cond. required | null    | Required for international. See § 4                                                                              |
| `advanced_options`     | object             | optional       | —       | See § 5                                                                                                          |
| `items`                | array              | optional       | `[]`    | Order line items                                                                                                 |
| `tax_identifiers`      | array              | optional       | —       | See § 4.1                                                                                                        |
| `order_source_code`    | string (enum)      | optional       | —       |                                                                                                                  |
| `comparison_rate_type` | string             | optional       | —       |                                                                                                                  |
| `shipping_rule_id`     | string             | optional       | —       |                                                                                                                  |

**Confidence: high** (openapi.json `shipment_request` schema required array + properties).

---

## 3. POST /v1/labels/rates/{rate_id}

**Schema:** `create_label_from_rate_request_body`
**Source:** openapi.json `#/components/schemas/create_label_from_rate_request_body`

Path param `rate_id` (string, se_id) identifies the previously calculated rate to use.

**All shipment data (carrier, service, addresses, packages, customs) is fixed from the rate.** This endpoint body accepts only label presentation overrides and a few field overrides:

| Field                 | Type          | Status   | Default | Survives from rate?                                                                       |
| --------------------- | ------------- | -------- | ------- | ----------------------------------------------------------------------------------------- |
| `label_format`        | string (enum) | optional | `pdf`   | Override                                                                                  |
| `label_layout`        | string (enum) | optional | `4x6`   | Override                                                                                  |
| `label_download_type` | string (enum) | optional | `url`   | Override                                                                                  |
| `display_scheme`      | string (enum) | optional | `label` | Override                                                                                  |
| `validate_address`    | string (enum) | optional | (none)  | Override                                                                                  |
| `custom_field1`       | string        | optional | —       | Override (carrier-dependent; top-level here vs inside `advanced_options` on direct label) |
| `custom_field2`       | string        | optional | —       | Override                                                                                  |
| `custom_field3`       | string        | optional | —       | Override                                                                                  |

**Fields that come entirely from the rate (cannot override here):**
carrier_id, service_code, ship_to, ship_from/warehouse_id, packages, customs, advanced_options (except custom_field1/2/3), insurance_provider, confirmation, ship_date.

**Confidence: high** (openapi.json `create_label_from_rate_request_body` schema; field-set explicitly verified against schema — no hidden shipment fields in body).

---

## 3. Shared Sub-Schemas

### 3.1 address (ship_to / return_to)

Schema: `address` component, augmented by `shipping_address_to` (adds `instructions`, `geolocation`).

| Field                           | Type          | Status       | Notes                                                 |
| ------------------------------- | ------------- | ------------ | ----------------------------------------------------- |
| `name`                          | string        | **REQUIRED** | minLength: 1                                          |
| `address_line1`                 | string        | **REQUIRED** | minLength: 1                                          |
| `city_locality`                 | string        | **REQUIRED** | minLength: 1                                          |
| `state_province`                | string        | **REQUIRED** | minLength: 1                                          |
| `postal_code`                   | string        | **REQUIRED** | minLength: 1                                          |
| `phone`                         | string        | optional     | minLength: 1                                          |
| `email`                         | string        | optional     | OpenAPI-only field                                    |
| `company_name`                  | string        | optional     | minLength: 1                                          |
| `address_line2`                 | string        | optional     |                                                       |
| `address_line3`                 | string        | optional     |                                                       |
| `country_code`                  | string        | optional     | ISO 3166-1 alpha-2, 2 chars                           |
| `address_residential_indicator` | string (enum) | optional     | default: `unknown`. `unknown`, `yes`, `no`            |
| `instructions`                  | string/object | optional     | Delivery instructions (shipping_address_to extension) |
| `geolocation`                   | array         | optional     | Lat/lon coordinates (shipping_address_to extension)   |

Note from docs: either `name` or `company_name` must be set.

**Confidence: high** (openapi.json `address` component required array + `shipping_address_to` allOf).

### 3.2 address (ship_from)

Same as § 3.1 plus additional required fields from `shipping_address_from`:

| Field          | Additional status                                  |
| -------------- | -------------------------------------------------- |
| `phone`        | **REQUIRED** (additionally required for ship_from) |
| `country_code` | **REQUIRED** (additionally required for ship_from) |
| `instructions` | optional                                           |

**Confidence: high** (openapi.json `shipping_address_from` schema, required: `['phone', 'country_code']`).

### 3.3 packages array item

minItems: 1. Each item: schema title `package`.

| Field                 | Type   | Status       | Default                          | Notes                                                                                                                                                                       |
| --------------------- | ------ | ------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weight`              | object | **REQUIRED** | —                                | `{ value: number (>0), unit: enum[pound, ounce, gram, kilogram] }`                                                                                                          |
| `dimensions`          | object | optional     | —                                | `{ unit: enum[inch, centimeter] (default: inch), length, width, height: number (≥0) }`. All four sub-fields required if object is provided.                                 |
| `package_code`        | string | optional     | —                                | Pattern `^[a-z0-9]+(_[a-z0-9]+)*$`. Identifies a carrier package type                                                                                                       |
| `package_id`          | string | optional     | —                                |                                                                                                                                                                             |
| `package_name`        | string | optional     | —                                |                                                                                                                                                                             |
| `insured_value`       | object | optional     | `{ currency: "USD", amount: 0 }` | `{ currency: enum[usd,cad,aud,gbp,eur,nzd], amount: number (≥0) }`. Required sub-fields: currency, amount.                                                                  |
| `label_messages`      | object | optional     | —                                | `{ reference1: string\|null, reference2: string\|null, reference3: string\|null }`. All three fields required if object provided (may be null). Carrier-dependent printing. |
| `external_package_id` | string | optional     | —                                | minLength: 1                                                                                                                                                                |
| `tracking_number`     | string | optional     | —                                | OpenAPI-only                                                                                                                                                                |
| `content_description` | string | optional     | —                                | OpenAPI-only                                                                                                                                                                |
| `products`            | array  | optional     | `[]`                             | OpenAPI-only                                                                                                                                                                |

**Confidence: high** (openapi.json `package` component + JSON schema repo package schema cross-referenced).

---

## 4. customs object

Required when destination country differs from origin (international shipments).

| Field                        | Type          | Status       | Default            | Notes                                                          |
| ---------------------------- | ------------- | ------------ | ------------------ | -------------------------------------------------------------- |
| `contents`                   | string (enum) | **REQUIRED** | `merchandise`      | `merchandise`, `documents`, `gift`, `returned_goods`, `sample` |
| `non_delivery`               | string (enum) | **REQUIRED** | `return_to_sender` | `return_to_sender`, `treat_as_abandoned`                       |
| `customs_items`              | array         | optional     | `[]`               | See § 4.2                                                      |
| `contents_explanation`       | string        | optional     | —                  | OpenAPI-only; free-text description                            |
| `terms_of_trade_code`        | string        | optional     | —                  | OpenAPI-only; Incoterms                                        |
| `declaration`                | string        | optional     | —                  |                                                                |
| `invoice_additional_details` | object        | optional     | —                  | OpenAPI-only                                                   |
| `importer_of_record`         | object        | optional     | —                  | OpenAPI-only                                                   |
| `license_number`             | string        | optional     | —                  |                                                                |
| `certificate_number`         | string        | optional     | —                  |                                                                |

### 4.1 tax_identifiers array item

| Field                 | Type                                             | Status       |
| --------------------- | ------------------------------------------------ | ------------ |
| `taxable_entity_type` | enum [shipper, recipient]                        | **REQUIRED** |
| `identifier_type`     | enum [vat, eori, ssn, ein, tin, ioss, pan, voec] | **REQUIRED** |
| `issuing_authority`   | string                                           | **REQUIRED** |
| `value`               | string                                           | **REQUIRED** |

### 4.2 customs_items array item

JSON schema repo: no required fields. OpenAPI spec: `customs_item_id` required (but this is a response/read field — treat as optional on create).

| Field                    | Type    | Notes                           |
| ------------------------ | ------- | ------------------------------- |
| `description`            | string  | Item description                |
| `quantity`               | integer | default: 0                      |
| `value`                  | object  | `{ currency, amount }`          |
| `harmonized_tariff_code` | string  | HS tariff code                  |
| `country_of_origin`      | string  | ISO 2-char                      |
| `unit_of_measure`        | string  |                                 |
| `sku`                    | string  |                                 |
| `sku_description`        | string  |                                 |
| `weight`                 | object  | OpenAPI-only: `{ value, unit }` |
| `value_currency`         | string  | OpenAPI-only                    |

---

## 5. advanced_options object

All fields optional. Carrier-dependent support.

| Field                            | Type                          | Default | Notes                                                                                            |
| -------------------------------- | ----------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `bill_to_account`                | string                        | null    | Third-party billing account                                                                      |
| `bill_to_country_code`           | string                        | null    | ISO 2-char                                                                                       |
| `bill_to_party`                  | enum [recipient, third_party] | null    |                                                                                                  |
| `bill_to_postal_code`            | string                        | null    |                                                                                                  |
| `contains_alcohol`               | boolean                       | false   |                                                                                                  |
| `delivered_duty_paid`            | boolean                       | false   | DDP Incoterm                                                                                     |
| `dry_ice`                        | boolean                       | false   |                                                                                                  |
| `dry_ice_weight`                 | object                        | —       | `{ value, unit }`                                                                                |
| `non_machinable`                 | boolean                       | false   |                                                                                                  |
| `saturday_delivery`              | boolean                       | false   |                                                                                                  |
| `fedex_freight`                  | object                        | —       | `{ shipper_load_and_count, booking_confirmation }`                                               |
| `use_ups_ground_freight_pricing` | boolean                       | null    |                                                                                                  |
| `freight_class`                  | string                        | null    |                                                                                                  |
| `custom_field1`                  | string                        | null    | maxLength: 100. Printed on label (carrier-dependent)                                             |
| `custom_field2`                  | string                        | null    | maxLength: 100                                                                                   |
| `custom_field3`                  | string                        | null    | maxLength: 100                                                                                   |
| `origin_type`                    | enum [pickup, drop_off]       | null    |                                                                                                  |
| `shipper_release`                | boolean                       | null    |                                                                                                  |
| `collect_on_delivery`            | object                        | —       | `{ payment_type: enum[any, cash, cash_equivalent, none], payment_amount: { currency, amount } }` |
| `additional_handling`            | boolean                       | null    | OpenAPI-only                                                                                     |
| `third_party_consignee`          | boolean                       | false   | OpenAPI-only                                                                                     |
| `dangerous_goods`                | boolean                       | false   | OpenAPI-only                                                                                     |
| `dangerous_goods_contact`        | object                        | —       | OpenAPI-only                                                                                     |
| `windsor_framework_details`      | object                        | —       | OpenAPI-only                                                                                     |
| `fragile`                        | boolean                       | false   | OpenAPI-only                                                                                     |
| `regulated_content_type`         | enum                          | null    | OpenAPI-only                                                                                     |
| `license_number`                 | string                        | null    | OpenAPI-only                                                                                     |
| `invoice_number`                 | string                        | null    | OpenAPI-only                                                                                     |
| `certificate_number`             | string                        | null    | OpenAPI-only                                                                                     |

Note: `custom_field1/2/3` in `advanced_options` (nested inside `shipment.advanced_options` on POST /v1/labels) are equivalent to the top-level `custom_field1/2/3` on POST /v1/labels/rates/{rate_id}. These are not the same field path.

---

## 6. Field survival: direct label vs label-from-rate

| Field category                | POST /v1/labels                | POST /v1/labels/rates/{rate_id}              |
| ----------------------------- | ------------------------------ | -------------------------------------------- |
| carrier_id / service_code     | Set in body                    | **Frozen** from rate                         |
| ship_to / ship_from           | Set in body                    | **Frozen** from rate                         |
| packages (weight, dimensions) | Set in body                    | **Frozen** from rate                         |
| customs                       | Set in body                    | **Frozen** from rate                         |
| advanced_options (most)       | Set in body                    | **Frozen** from rate                         |
| custom_field1/2/3             | In `shipment.advanced_options` | **Top-level override** (can change)          |
| label_format / layout         | Top-level                      | Top-level (can change)                       |
| label_download_type           | Top-level                      | Top-level (can change)                       |
| display_scheme                | Top-level                      | Top-level (can change)                       |
| validate_address              | Top-level                      | Top-level (can change)                       |
| test_label                    | Top-level                      | **Not available** (frozen from rate context) |
| is_return_label / rma_number  | Top-level                      | **Not available**                            |
| charge_event                  | Top-level                      | **Not available**                            |
| outbound_label_id             | Top-level                      | **Not available**                            |
| label_image_id                | Top-level                      | **Not available**                            |

---

## 7. Discrepancies and Ambiguities

### D1 — validate_address default inconsistency

- **JSON schema repo** `create_label_request_body`: default = `validate_and_clean`
- **OpenAPI spec** `create_label_request_body`: default = `no_validation`
- **Evidence:** JSON schema repo file `requests/create_label_request_body.json` line 900-902; OpenAPI spec `components/schemas/create_label_request_body` validate_address property.
- **Implication:** Behavior depends on which spec version is deployed. OpenAPI spec is more recent.
- **Recommendation:** Use the OpenAPI spec value (`no_validation`) as authoritative.
- **Confidence: high**

### D2 — label_layout enum divergence

- **JSON schema repo:** `[4x6, letter]`
- **OpenAPI spec:** `[4x6, letter, A4, A6]`
- **Evidence:** JSON schema repo `create_label_from_rate_request_body.json` line 31-36; OpenAPI spec.
- **Implication:** A4/A6 are available in the live API but absent from older schema files.
- **Confidence: high**

### D3 — display_scheme enum divergence

- **JSON schema repo:** `[label, qr_code]`
- **OpenAPI spec:** `[label, paperless, label_and_paperless]`
- **Evidence:** JSON schema repo `create_label_from_rate_request_body.json` line 64-76; OpenAPI spec.
- **Implication:** `qr_code` value is deprecated/removed; `paperless` and `label_and_paperless` are new.
- **Confidence: high**

### D4 — ship_to address required fields discrepancy

- **JSON schema repo:** address required = `[name, phone, address_line1, city_locality, state_province, postal_code, country_code, address_residential_indicator]`
- **OpenAPI spec:** address required = `[name, address_line1, city_locality, state_province, postal_code]`; ship_from additionally requires `phone` and `country_code`.
- **Evidence:** JSON schema repo `calculate_rates_request_body.json` lines 228-238 (ship_to required array); OpenAPI spec `address` component `required` array.
- **Implication:** API may be more lenient on ship_to than JSON schema repo suggests, but ship_from requires `phone` and `country_code` per OpenAPI spec.
- **Recommendation:** Always supply phone and country_code for all addresses to be safe.
- **Confidence: high**

### D5 — customs_item required fields inconsistency

- **JSON schema repo:** `required: []`
- **OpenAPI spec:** `required: [customs_item_id]` — but `customs_item_id` is a server-assigned response field.
- **Evidence:** JSON schema repo `calculate_rates_request_body.json` line 580-581; OpenAPI spec `customs_item` component.
- **Implication:** The `customs_item_id` should not be sent in requests; the OpenAPI schema error likely refers to the response model. No customs_item field is actually required on create.
- **Confidence: medium** (cannot confirm without live API test)

### D6 — insured_value default type mismatch

- **JSON schema repo:** `default: [{"currency": "usd", "amount": 0}]` (array — wrong type)
- **OpenAPI spec:** `default: {"currency": "USD", "amount": 0}` (correct object)
- **Evidence:** JSON schema repo `calculate_rates_request_body.json` lines 1048-1054; OpenAPI spec `package` component.
- **Implication:** JSON schema repo has a bug. OpenAPI spec is correct.
- **Confidence: high**

### D7 — OpenAPI-only fields (may not have been in original JSON schema repo)

Fields present in OpenAPI spec but absent from JSON schema repo:
`shipping_rule_id`, `shipment_number`, `comparison_rate_type` (shipment),
`email` (address), `instructions` / `geolocation` (address extensions),
`tracking_number`, `content_description`, `products` (package),
`contents_explanation`, `terms_of_trade_code`, `importer_of_record` (customs),
`additional_handling`, `third_party_consignee`, `dangerous_goods`, `fragile`, `regulated_content_type` (advanced_options),
`rate_type` (rate_options).

- **Implication:** JSON schema repo is a frozen snapshot; OpenAPI spec reflects current API capabilities.
- **Confidence: high**

---

## 8. Gaps

- **Carrier-specific service codes and package codes** are not enumerated in the schemas. Must use `GET /v1/carriers/{carrier_id}/services` and `GET /v1/carriers/{carrier_id}/packages` at runtime.
- **Which `confirmation` and `advanced_options` values each carrier supports** is not in the schema; must be inferred from carrier docs or `GET /v1/carriers`.
- **Rate expiry / rate_id TTL:** Duration a `rate_id` remains valid for label purchase is not documented in the schema. ShipEngine docs state rates expire within ~1 hour but this was not verified in the machine-readable spec.
- **`label_messages` print behavior per carrier** (which carriers print reference1/2/3, field length limits per carrier) is described only in narrative docs, not in the schema.
- **`display_scheme: paperless` and `label_and_paperless`** — documentation on which carriers and countries support paperless was not verified.
- **`relay_points` field** appears in the JSON schema repo `create_label_request_body` (lines 975+) but not surfaced clearly in the OpenAPI spec analysis. Requires further investigation for its carrier applicability.
- **Live API behavior vs schema:** No live API calls were made. Discrepancies between schema and live behavior cannot be ruled out.
