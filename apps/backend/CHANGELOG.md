# Changelog

## [0.0.2](https://github.com/masto182/HandG/compare/v0.0.1...v0.0.2) (2026-07-05)


### Features

* **payments:** dynamic PayID hold hours and per-order extension ([4d0b7a3](https://github.com/masto182/HandG/commit/4d0b7a39f5e12990bb3f4040c3a8a8118a99d984))
* pre-prod readiness pass — remediation, QA fixes, deferred items ([aab052b](https://github.com/masto182/HandG/commit/aab052b1fa2406cc3d761f76ad6aaa1811db28fc))
* **stock-import:** sync anniversary product tag from CSV ([3760570](https://github.com/masto182/HandG/commit/376057028fd84dfb8cc00f93640a7773a7961d78))
* **stock-import:** wire description field, fix export gaps, surface validation errors ([9b43b05](https://github.com/masto182/HandG/commit/9b43b0534e4164ba6cec6ab40635ad599fa79980))
* **storefront:** complete mobile UX overhaul — phases 1–5 ([9f699d4](https://github.com/masto182/HandG/commit/9f699d4f8fdbd24448c8da2a79b675742c584882))


### Bug Fixes

* approve-member metadata + apply form confirm password ([c37e1c3](https://github.com/masto182/HandG/commit/c37e1c330e64f01bfe32f5fd46f010a6286fb8c5))
* **auth:** normalise email case on emailpass auth routes ([f428f01](https://github.com/masto182/HandG/commit/f428f01a56d62690efa9ddecc865de7e4cbc60c6))
* **auth:** normalize email to trimmed lowercase ([70e9dd6](https://github.com/masto182/HandG/commit/70e9dd68d34b2773611e5a6330f7eb3cc2236d55))
* **backend:** cast newPassword to string before .length check ([d3badfd](https://github.com/masto182/HandG/commit/d3badfd7db162067b1bb168d4600c4ee80f990f4))
* **checkout:** create default shipping profile and link products in seed ([8154624](https://github.com/masto182/HandG/commit/8154624b3fd7949457ab750e17d977543b0ab57d))
* copy shared-types package to runner stage in Dockerfile ([d613265](https://github.com/masto182/HandG/commit/d613265dbfff3751ae2641f086c243ffb92d2598))
* correct account-security test expectations to match route semantics ([bf2eace](https://github.com/masto182/HandG/commit/bf2eace1cc13b575276d7a9c1a3c7a9792c7e14b))
* correct integration test auth setup and module resolution ([bf7984b](https://github.com/masto182/HandG/commit/bf7984bdd9f5803d0b4adf97c7a4afa73b08a4d9))
* correct link order and use LINK not REMOTE_LINK for api_key↔sales_channel ([35dbd80](https://github.com/masto182/HandG/commit/35dbd8050de79fd75bce3b540e01cb44722470a6))
* correct migration import path and test mock cast ([81cb1ef](https://github.com/masto182/HandG/commit/81cb1efcff20bd292b95a72f1f66b53aec726eca))
* created_by must be string in CreateApiKeyDTO ([b4fd0ac](https://github.com/masto182/HandG/commit/b4fd0ac662563f163965eaa9081dab1ea735a68b))
* **e2e:** eliminate networkidle flakiness + fix buy-at-price toggle and admin approve ([739e091](https://github.com/masto182/HandG/commit/739e091b83b3ae1a31ef92868c68b67f0dc6a2c8))
* **e2e:** explicitly link products to sales channel + several test fixes ([517557b](https://github.com/masto182/HandG/commit/517557bb5b0ce2088fffae43a5253fdb61754f10))
* **e2e:** fill confirm_password in apply() helper; add workflow-exempt markers ([4626366](https://github.com/masto182/HandG/commit/4626366a509ef89f7018b548b7e79a531a2d363a))
* **e2e:** green the nightly E2E suite ([7b73610](https://github.com/masto182/HandG/commit/7b7361051a9dc16a03ac550fc00586add123dae7))
* **e2e:** make workflow-exempt markers survive prettier (single-line calls) ([83b8c84](https://github.com/masto182/HandG/commit/83b8c8481110d036bb91b1f6c33ff0d24b9ac74d))
* **e2e:** mark 7 legitimate direct-mutation routes workflow-exempt ([1d7be52](https://github.com/masto182/HandG/commit/1d7be523b2be4dc9c26dd9a0fdf2744864dc94dc))
* **e2e:** set non-Secure session cookie over http in CI so admin login works ([711ee8f](https://github.com/masto182/HandG/commit/711ee8f215907a0c0b519822f2c574cc00acaa28))
* **e2e:** shipping prices, workflow-exempt comments, login assertion, theme toggle ([9c384fc](https://github.com/masto182/HandG/commit/9c384fc9d4bb18014d496f8981572d566e90a78b))
* guard inbox rename migration against pre-existing inbox_notification ([96d1ad7](https://github.com/masto182/HandG/commit/96d1ad78fb8b766fdfe90e1cc527af9c2465727a))
* **integration-tests:** fix CSV cell regex in GET export test ([3a165c3](https://github.com/masto182/HandG/commit/3a165c3ccf95ccc81be2b45a182e9d72eee3212e))
* **integration-tests:** seed BeerStyles in beforeAll to fix style-mismatch errors ([1eed43b](https://github.com/masto182/HandG/commit/1eed43bea379c3deb1be8fa2b2b8730fdc8b1303))
* make variant price update non-blocking in updateImportedProductWorkflow ([3a1ac2d](https://github.com/masto182/HandG/commit/3a1ac2d1e2ec1ba9562ca7a3de328bb52de1a1e9))
* **migrations:** regenerate v1 baselines with correct full-schema CREATE TABLE ([fe77c88](https://github.com/masto182/HandG/commit/fe77c888c30170bb008cf8bd0b6f48154214f899))
* **migrations:** restore missing unique/composite indexes in squash baselines ([ce784e3](https://github.com/masto182/HandG/commit/ce784e3327813c80fd643ac0dd4f36ca4c2241b8))
* **orders:** fetch shipping_methods and show carrier-friendly name on order page ([c8ba68f](https://github.com/masto182/HandG/commit/c8ba68fd04c952172529da0a6f0af5c41ce9cf88))
* product-images and stock-import update bugs ([91b1e22](https://github.com/masto182/HandG/commit/91b1e220fc1f9d3e273b5c12e58e582ae44b00a5))
* reliable DB migrations via direct-SQL runner; avoid npx on start ([b5a150a](https://github.com/masto182/HandG/commit/b5a150a4795915383047b48d4e1bcd51be67835e))
* remove variants.prices from listProducts relations (invalid nesting) ([6d01d4d](https://github.com/masto182/HandG/commit/6d01d4d3adc3f87388e48803294d44e4c91ad829))
* rename inbox migration tables from notification to inbox_notification ([8805060](https://github.com/masto182/HandG/commit/8805060d64f7817054ab2b1cf7ce960886f467d3))
* rename inbox model entity to inbox_notification to avoid Medusa core alias conflict ([adb11cd](https://github.com/masto182/HandG/commit/adb11cda12d935e584f7bf16afaafe72382bfd27))
* rename notification module dir to inbox to resolve Medusa alias conflict ([d51c99d](https://github.com/masto182/HandG/commit/d51c99dbab5b0960d5d6741767c8a689e2b259f3))
* resolve 4 failing integration test bugs ([5d9a99c](https://github.com/masto182/HandG/commit/5d9a99c046adaeb496ce7f957eb3996b9d331e5f))
* resolve migration name collision and hops-api auth setup ([b1c4a51](https://github.com/masto182/HandG/commit/b1c4a5165dc1d120bfb3535510af871fe2d7a3c2))
* **search:** remove inventory_qty availability filter ([4f6d02a](https://github.com/masto182/HandG/commit/4f6d02aa32a3193a67d5b2a144928e8a0f2f12e1))
* **seed:** add missing provider+fulfillment links and reorder before createShippingOptionsWorkflow ([353ee3b](https://github.com/masto182/HandG/commit/353ee3b1be01dffdc2b5941ff33942527279d41e))
* **seed:** collect product IDs in loop — fix no-op workflow call ([598f3ad](https://github.com/masto182/HandG/commit/598f3ad2bda10f8e071a08773277e9209f7befe7))
* **seed:** fix TS types for pricingModule.createPriceSets and addPrices ([780f12e](https://github.com/masto182/HandG/commit/780f12ea0a0f172bc38569e789c1ab991fb58801))
* **seed:** set shipping option prices via pricing module after creation ([d966608](https://github.com/masto182/HandG/commit/d966608c9b1cd48d7eea84423ec35302d6722acf))
* **seed:** use named channel + linkProductsToSalesChannelWorkflow for product linking ([6608d78](https://github.com/masto182/HandG/commit/6608d7858155e2b5c5a5f11a845dad174d1de657))
* serve private OCI bucket images via backend /files proxy ([2a80f46](https://github.com/masto182/HandG/commit/2a80f46bb767400ab7a57c9b36f347b27a0bf2bc))
* start compiled Medusa server from .medusa/server; build shared-types to dist ([509d74b](https://github.com/masto182/HandG/commit/509d74b7dd4b19abbf245f13bd95314e2d61d078))
* stock-import variant guard; E2E start backend from .medusa/server ([664bf08](https://github.com/masto182/HandG/commit/664bf08bff694f989cba4b6355860a1ae1485837))
* **store:** fix filters, freshness, list-view layout, and search sort ([54d3b1b](https://github.com/masto182/HandG/commit/54d3b1b018f73e1a2986ab86cb2c5faffe8a79dc))
* **store:** remount product grid on filter change + index packaged_at_ts ([8dc8497](https://github.com/masto182/HandG/commit/8dc849727ba33bd0dcc4ad05d63a7fd0460fd28e))
* wire sales channel + inventory on import; add seed pipeline to staging deploy ([6f2b2bb](https://github.com/masto182/HandG/commit/6f2b2bb55c9328374273a11d6276d14a2cb4ba22))


### Refactoring

* **migrations:** squash v1 custom module migrations to single baselines ([f632da9](https://github.com/masto182/HandG/commit/f632da9be53a4411ac1bc0a155a12744a7feba55))


### CI/CD

* create publishable key for storefront, fix wait check ([b90c82b](https://github.com/masto182/HandG/commit/b90c82bb291e283f9659f1f71c2c298a36929182))
* use standard medusa db:migrate in deploys; retire direct-SQL runner ([fdfb706](https://github.com/masto182/HandG/commit/fdfb7065959ee291c6823fdc837309a571222159))
