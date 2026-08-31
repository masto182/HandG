# Changelog

## [0.0.4](https://github.com/masto182/HandG/compare/v0.0.3...v0.0.4) (2026-08-31)


### Features

* **account:** add click-through links to all notification types ([d9ca1b4](https://github.com/masto182/HandG/commit/d9ca1b468d9e6637bc6c09f6bdf5e6fd4c76a98b))
* **account:** add full Notifications inbox page + harden broadcast dispatch ([554ec15](https://github.com/masto182/HandG/commit/554ec15993e176b93e2b3d94da97a68847badca3))
* **admin:** add broadcast announcements (email + in-app inbox) ([d154c44](https://github.com/masto182/HandG/commit/d154c44f94eec99db43df5541fb165d8cdad7874))
* **admin:** add Email Templates preview page ([57697a5](https://github.com/masto182/HandG/commit/57697a588db517e50258f360c621fd80fb30a781))
* **admin:** allow a custom message on each specials send ([4dd5387](https://github.com/masto182/HandG/commit/4dd5387552d78bd1fea51036c50b7527683ecf24))
* **admin:** broadcast channels, site-banner integration, individual targeting, draft editing ([b9b583f](https://github.com/masto182/HandG/commit/b9b583fc7908780acdcd4de572b0a613a67d7f12))
* **admin:** cap the specials email to the best discounts, add a preview ([043bd37](https://github.com/masto182/HandG/commit/043bd37ea9cf1591e9192a6a30be66b6e157ecea))
* **admin:** specials/price-drop batch broadcast ([2ab6b8e](https://github.com/masto182/HandG/commit/2ab6b8e10db41086dde5a982e3e75b2b72905f73))
* **analytics:** fix funnel/drilldown, add session tracking, demand capture ([f2af55f](https://github.com/masto182/HandG/commit/f2af55fedb32e21ef87a8fec812b462471b2f276))
* **insights:** redesign admin Insights as a decision-first dashboard ([dd6e500](https://github.com/masto182/HandG/commit/dd6e500788dcd8c6ce872abd171fe93fe3e5046e))
* **notifications:** default everyone into "all new releases" (opt-out) ([bf690c8](https://github.com/masto182/HandG/commit/bf690c8df05441fd28a638b405db30426c17926a))
* **notifications:** exclude recipient from send, auto-render, auto-label, grid digest ([b8f88dc](https://github.com/masto182/HandG/commit/b8f88dc397b561c01571f6ea8fc0364a1f67855d))
* **notifications:** replace per-product new-drop emails with a personalized batch digest ([a558fa9](https://github.com/masto182/HandG/commit/a558fa9eda72c42760a1659c390bc6cae9b5db02))
* **promotions:** add Tree House brewery buy-4-get-1-free promotion ([#7](https://github.com/masto182/HandG/issues/7)) ([bcf85f8](https://github.com/masto182/HandG/commit/bcf85f8e2db5d9b7b5ddab8f53801e27b5c23961))
* **shipengine:** add carrier pickup scheduling ([47d0559](https://github.com/masto182/HandG/commit/47d0559e2422a63276be07db6ea3fa5ad6a00c44))


### Bug Fixes

* **admin:** allow clearing broadcast segment dropdowns ([f90fd50](https://github.com/masto182/HandG/commit/f90fd50854255504a06ecaeb040c19943a9e905d))
* **admin:** coerce specials_batch_item prices to Number before formatting ([295a39d](https://github.com/masto182/HandG/commit/295a39d82e0b909f6b6a04ef4139a1ba96534375))
* **admin:** exclude sold-out and unpublished products from specials ([2cc16bc](https://github.com/masto182/HandG/commit/2cc16bc505931c2b99544c4d7aa4a4989ce68f1e))
* **admin:** make specials notification category opt-in, not opt-out ([18806c7](https://github.com/masto182/HandG/commit/18806c79fe2791cf02e0a413bc45b04d54136b08))
* **admin:** move custom Campaigns/Specials page off colliding route ([55f196c](https://github.com/masto182/HandG/commit/55f196c4628c1256cf278f2ed1bd0f56e17998d8))
* **admin:** repair Insights links/funnel and add sell-through + buyer-type intelligence ([a3aafce](https://github.com/masto182/HandG/commit/a3aafce93d096cdadf3ce1825405573d6cdbf44f))
* **admin:** restore customer picker on draft reopen, show real recipient count before send ([f6fba7e](https://github.com/masto182/HandG/commit/f6fba7e60c33e17750d6c59c253c457f4d8f45f6))
* **admin:** retry failed specials batch never actually re-sent anything ([01440cc](https://github.com/masto182/HandG/commit/01440cc8fda5f3bdf36030b6bc9e6f2bbdfae4c4))
* **admin:** revert specials notification category to opt-out ([f9fa6f2](https://github.com/masto182/HandG/commit/f9fa6f27627cd1d57da9342d4ff80780917261d7))
* **admin:** source specials from real sale price lists, not the unused campaign module ([3a43744](https://github.com/masto182/HandG/commit/3a43744ed97e594b84008dcbbacf24229a4d2201))
* also repair order billing addresses in address-repair script ([7c683ab](https://github.com/masto182/HandG/commit/7c683abc20a3df2e9ff7789b6d970d33ccf33635))
* **auth:** use updateCustomers (plural) in password reset flow ([37e8817](https://github.com/masto182/HandG/commit/37e8817cdc72bb4d902ea2124ffc963a43e554d1))
* backfill NULL raw_stocked_quantity on staging inventory_level rows ([a8a3ea6](https://github.com/masto182/HandG/commit/a8a3ea61110f839a317347a4c5b3da105120a653))
* correct ShipEngine label data and malformed address capture ([e34d4b8](https://github.com/masto182/HandG/commit/e34d4b835b1cf2a429ec73b5227cdbbb26d6744c))
* **data:** merge duplicate Brujos/Fidens/Other Half brewery records ([d81c16e](https://github.com/masto182/HandG/commit/d81c16e673e4579d59f9ab6c790cf4a8ef16c1aa))
* **email:** order total resolved to 0 when items were requested together ([286674c](https://github.com/masto182/HandG/commit/286674c9c2745facdc7241d4f4f38e48aaa208ed))
* **email:** order-placed template divided prices by 100 incorrectly ([383b488](https://github.com/masto182/HandG/commit/383b488894b227268b279dff00942556aec318ae))
* **email:** order.placed subscriber sent $0.00 total in live emails ([e608ed2](https://github.com/masto182/HandG/commit/e608ed238aa14d435c4ff7abeae95e3692348bd6))
* emit customer.updated on member approve/reject so notification emails send ([d557dfc](https://github.com/masto182/HandG/commit/d557dfc92d129d2fee4bc70ea5c5d4aac9e7cb51))
* **notifications:** don't defer admin-triggered new drop sends for quiet hours ([ee0c4d7](https://github.com/masto182/HandG/commit/ee0c4d77f396444d62f6c3261a58170e1f8238a3))
* **notifications:** don't exclude a recipient unless their email actually sent ([5a7a8b8](https://github.com/masto182/HandG/commit/5a7a8b844f7ab5c1722b57d2badc791387f00ed1))
* **referral:** resolve blank names and wire up referrer point contribution ([ec16aea](https://github.com/masto182/HandG/commit/ec16aea66cd99b7570d7ef91cc1f5cf91ef58cb8))
* remove unfinished email-log module registration from medusa-config ([cb0ec8d](https://github.com/masto182/HandG/commit/cb0ec8df15c94c4d5cea97cce95a62d0f84a75a4))
* **scripts:** backfill-new-drop-queue only skips products with a real sent email ([f9e5ecf](https://github.com/masto182/HandG/commit/f9e5ecf8a893cf0016a8b66246c6777f67400385))
* **search:** keep inventory_qty live so counts and facets never go stale ([a323214](https://github.com/masto182/HandG/commit/a323214f922e7855e34932ff259b95f19e19eb4b))
* **search:** style filter never linked new beers, counted out-of-stock, and showed empty styles ([08506bc](https://github.com/masto182/HandG/commit/08506bc7cc3d5427c002ec098290e886537cea4e))
* send AusPost Extra Cover as a suboption, not a bare option_code ([7876922](https://github.com/masto182/HandG/commit/78769228508ff50d1c1c354038d6fd6539dcb56b))
* **shipengine:** correct hardcoded ship-from address and phone ([fd2d1a0](https://github.com/masto182/HandG/commit/fd2d1a0a2064b01f669e8690d9402dbc4f0651ba))
* **shipengine:** correct provider_id filter in pickups API ([7074326](https://github.com/masto182/HandG/commit/7074326b4e981e8d1cdd30f7e0d73f5546c70e8f))
* **shipengine:** fulfillment_label entity does not exist, breaking tracking webhooks ([7d3c30a](https://github.com/masto182/HandG/commit/7d3c30aa3d49e3bb99b605533419953999cb3988))
* stop seed.ts from recreating admin-renamed pickup locations ([4fee4ea](https://github.com/masto182/HandG/commit/4fee4ea2e91f9d5350d17143dc645f69cae1cb4d))
* **test:** update member-activity mock for getLastActiveByCustomerIds ([2167ea7](https://github.com/masto182/HandG/commit/2167ea765030b978f06084756d1126f42b1525d5))


### Refactoring

* **admin:** redesign specials send to auto-select and send to everyone ([22e9cc1](https://github.com/masto182/HandG/commit/22e9cc1864afba8aa3932ff4bfd148abb47e44d4))

## [0.0.3](https://github.com/masto182/HandG/compare/v0.0.2...v0.0.3) (2026-08-17)


### Features

* add self-service forgot-password / reset-password flow ([000fab4](https://github.com/masto182/HandG/commit/000fab48079582ac98b7ff07019fa06b5d9248d2))
* **admin:** add Reindex Catalogue button to Stock Import page ([f5c93ef](https://github.com/masto182/HandG/commit/f5c93ef31e3288e190e8709ad744c8e77bc72299))
* **analytics:** member funnel, product/filter drill-down, referrals ([64255d8](https://github.com/masto182/HandG/commit/64255d8851a812de95c19e1af534641f28e91130))
* **analytics:** storefront event-tracking pipeline + Demand & Behaviour dashboard tab ([bee2075](https://github.com/masto182/HandG/commit/bee20751f6ea9aac7661d2ebf4565bda8968d7f8))
* **banners:** site-wide announcement banner management + onboarding fixes ([e00e05c](https://github.com/masto182/HandG/commit/e00e05c291c06825ace62f5fab4725d75d32300c))
* **import:** add sale pricing via SALE price lists (Option A) ([3ac04e3](https://github.com/masto182/HandG/commit/3ac04e300014d5105c257160d783ffa869ab848f))
* **import:** update import-us-beers with real prices and idempotency ([a4ff4e5](https://github.com/masto182/HandG/commit/a4ff4e539988d3165303ef717ac7fc512f40819b))
* **onboarding:** gamified getting-started page with VIP event ledger ([54a18ac](https://github.com/masto182/HandG/commit/54a18ac73371cdd20d8b50db6def74c552880de5))
* **payments:** dynamic PayID hold hours and per-order extension ([4d0b7a3](https://github.com/masto182/HandG/commit/4d0b7a39f5e12990bb3f4040c3a8a8118a99d984))
* pre-prod readiness pass — remediation, QA fixes, deferred items ([aab052b](https://github.com/masto182/HandG/commit/aab052b1fa2406cc3d761f76ad6aaa1811db28fc))
* **stock-import:** sync anniversary product tag from CSV ([3760570](https://github.com/masto182/HandG/commit/376057028fd84dfb8cc00f93640a7773a7961d78))
* **stock-import:** wire description field, fix export gaps, surface validation errors ([9b43b05](https://github.com/masto182/HandG/commit/9b43b0534e4164ba6cec6ab40635ad599fa79980))
* **storefront:** complete mobile UX overhaul — phases 1–5 ([9f699d4](https://github.com/masto182/HandG/commit/9f699d4f8fdbd24448c8da2a79b675742c584882))


### Bug Fixes

* **admin:** rename reserved `ref` prop in ReferredByCell to `referrer` ([6524e04](https://github.com/masto182/HandG/commit/6524e04d515d4c2bedc6b4ae263c4e2a69c472ce))
* approve-member metadata + apply form confirm password ([c37e1c3](https://github.com/masto182/HandG/commit/c37e1c330e64f01bfe32f5fd46f010a6286fb8c5))
* authenticate restock-alert routes, log real subscribe errors ([05d6048](https://github.com/masto182/HandG/commit/05d604890ba3a87aad4a050d9fa15b84b4b6df4d))
* **auth:** normalise email case on emailpass auth routes ([f428f01](https://github.com/masto182/HandG/commit/f428f01a56d62690efa9ddecc865de7e4cbc60c6))
* **auth:** normalize email to trimmed lowercase ([70e9dd6](https://github.com/masto182/HandG/commit/70e9dd68d34b2773611e5a6330f7eb3cc2236d55))
* **backend:** add pg-god as explicit devDependency for test-utils ([3dede0f](https://github.com/masto182/HandG/commit/3dede0f2e84f398b2170ea4acd2565ec85b71b07))
* **backend:** cast newPassword to string before .length check ([d3badfd](https://github.com/masto182/HandG/commit/d3badfd7db162067b1bb168d4600c4ee80f990f4))
* **backend:** exclude integration-tests from tsc compilation ([a41efce](https://github.com/masto182/HandG/commit/a41efce6ce47be9ab3dc94836c7d316aa7b37381))
* **backend:** resolve ambiguous sales channel lookup before product import ([b027e8d](https://github.com/masto182/HandG/commit/b027e8d48b344f12bb3066ddeb8afe0e539b0d46))
* **checkout:** create default shipping profile and link products in seed ([8154624](https://github.com/masto182/HandG/commit/8154624b3fd7949457ab750e17d977543b0ab57d))
* **ci:** add explicit field select to fix workflow-context list queries ([5818c71](https://github.com/masto182/HandG/commit/5818c712872d97850a6b5484da40befbfdf55d2c))
* **ci:** pin jest 30.4.1 and restore --experimental-vm-modules for unit tests ([0387b3d](https://github.com/masto182/HandG/commit/0387b3d61c658c31b8fe1820d218e0a0c8b73451))
* **ci:** resolve 4 integration test failures and Lighthouse CI exit-code-1 ([b350575](https://github.com/masto182/HandG/commit/b35057555acffc5909a679029f35e026131b0da7))
* **ci:** restore --experimental-vm-modules in run-http.mjs for integration tests ([96abf4c](https://github.com/masto182/HandG/commit/96abf4c8c296f680af5c787f8e0a42c96a0e1aba))
* copy shared-types package to runner stage in Dockerfile ([d613265](https://github.com/masto182/HandG/commit/d613265dbfff3751ae2641f086c243ffb92d2598))
* correct account-security test expectations to match route semantics ([bf2eace](https://github.com/masto182/HandG/commit/bf2eace1cc13b575276d7a9c1a3c7a9792c7e14b))
* correct integration test auth setup and module resolution ([bf7984b](https://github.com/masto182/HandG/commit/bf7984bdd9f5803d0b4adf97c7a4afa73b08a4d9))
* correct link order and use LINK not REMOTE_LINK for api_key↔sales_channel ([35dbd80](https://github.com/masto182/HandG/commit/35dbd8050de79fd75bce3b540e01cb44722470a6))
* correct migration import path and test mock cast ([81cb1ef](https://github.com/masto182/HandG/commit/81cb1efcff20bd292b95a72f1f66b53aec726eca))
* correct order-confirmed email totals and payment/pickup copy ([ca2c268](https://github.com/masto182/HandG/commit/ca2c2688831956c5dff79b78c215fbd5e856deeb))
* created_by must be string in CreateApiKeyDTO ([b4fd0ac](https://github.com/masto182/HandG/commit/b4fd0ac662563f163965eaa9081dab1ea735a68b))
* **docker:** increase Node heap for medusa build in Dockerfile ([f39225e](https://github.com/masto182/HandG/commit/f39225e55e893459c9e516c5e4a753d5db631896))
* **docker:** stop pnpm 11 re-resolving the workspace during image builds ([ace8356](https://github.com/masto182/HandG/commit/ace83567329c7488a0a303c793605b29c896030a))
* **e2e:** add prettier-ignore to keep workflow-exempt comment inline ([ab92528](https://github.com/masto182/HandG/commit/ab92528cefe866f54d91fabfe00da52d227a549b))
* **e2e:** eliminate networkidle flakiness + fix buy-at-price toggle and admin approve ([739e091](https://github.com/masto182/HandG/commit/739e091b83b3ae1a31ef92868c68b67f0dc6a2c8))
* **e2e:** explicitly link products to sales channel + several test fixes ([517557b](https://github.com/masto182/HandG/commit/517557bb5b0ce2088fffae43a5253fdb61754f10))
* **e2e:** fill confirm_password in apply() helper; add workflow-exempt markers ([4626366](https://github.com/masto182/HandG/commit/4626366a509ef89f7018b548b7e79a531a2d363a))
* **e2e:** green the nightly E2E suite ([7b73610](https://github.com/masto182/HandG/commit/7b7361051a9dc16a03ac550fc00586add123dae7))
* **e2e:** make workflow-exempt markers survive prettier (single-line calls) ([83b8c84](https://github.com/masto182/HandG/commit/83b8c8481110d036bb91b1f6c33ff0d24b9ac74d))
* **e2e:** mark 7 legitimate direct-mutation routes workflow-exempt ([1d7be52](https://github.com/masto182/HandG/commit/1d7be523b2be4dc9c26dd9a0fdf2744864dc94dc))
* **e2e:** move exemption comments inline with the matched grep line ([7dcdb05](https://github.com/masto182/HandG/commit/7dcdb055a933933de53ab007909415041d772148))
* **e2e:** resolve all pre-existing enforcement test violations ([ccfc40b](https://github.com/masto182/HandG/commit/ccfc40bc26a4205ef8f31744a38f0fc1ac715c1a))
* **e2e:** satisfy sdk/workflow enforcement guards, unblock E2E Nightly ([a9c67c8](https://github.com/masto182/HandG/commit/a9c67c8f874c9b3bb82125278d456e171aaffd0f))
* **e2e:** set non-Secure session cookie over http in CI so admin login works ([711ee8f](https://github.com/masto182/HandG/commit/711ee8f215907a0c0b519822f2c574cc00acaa28))
* **e2e:** shipping prices, workflow-exempt comments, login assertion, theme toggle ([9c384fc](https://github.com/masto182/HandG/commit/9c384fc9d4bb18014d496f8981572d566e90a78b))
* **forgot-password:** pass email template module, not default component ([1a3ffb5](https://github.com/masto182/HandG/commit/1a3ffb58fc42b3b3b0fa86766cc1ecd00b994f7f))
* guard inbox rename migration against pre-existing inbox_notification ([96d1ad7](https://github.com/masto182/HandG/commit/96d1ad78fb8b766fdfe90e1cc527af9c2465727a))
* **hops:** fix inventory filter on hop detail route; add hop linking to US beer import ([fffe586](https://github.com/masto182/HandG/commit/fffe58666f75fc2cc4d321783d407ba93c58116e))
* **import:** fix applyStock — skip variant_id filter, use SKU lookup ([e8e23db](https://github.com/masto182/HandG/commit/e8e23db478523c03cd7b5f4b0ee07fcb50ed5f25))
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
* **seed:** auto-populate shipengine_carrier_ids in site_config from listCarriers() ([f50c1e7](https://github.com/masto182/HandG/commit/f50c1e74db0e06984bdfe18559b59adc24f6c73a))
* **seed:** catch 'Cannot create multiple links' in safeLink for idempotency on prod ([bf2b1cb](https://github.com/masto182/HandG/commit/bf2b1cb19972409e3d2e7f77a808cb85e51c67d2))
* **seed:** collect product IDs in loop — fix no-op workflow call ([598f3ad](https://github.com/masto182/HandG/commit/598f3ad2bda10f8e071a08773277e9209f7befe7))
* **seed:** fix TS types for pricingModule.createPriceSets and addPrices ([780f12e](https://github.com/masto182/HandG/commit/780f12ea0a0f172bc38569e789c1ab991fb58801))
* **seed:** look up pickup locations by stock_location_id for idempotency on prod ([3ad9209](https://github.com/masto182/HandG/commit/3ad92095c6264b05fa7a760813e9890604db021e))
* **seed:** set shipping option prices via pricing module after creation ([d966608](https://github.com/masto182/HandG/commit/d966608c9b1cd48d7eea84423ec35302d6722acf))
* **seed:** use named channel + linkProductsToSalesChannelWorkflow for product linking ([6608d78](https://github.com/masto182/HandG/commit/6608d7858155e2b5c5a5f11a845dad174d1de657))
* serve private OCI bucket images via backend /files proxy ([2a80f46](https://github.com/masto182/HandG/commit/2a80f46bb767400ab7a57c9b36f347b27a0bf2bc))
* single-source pickup fulfillment inventory at warehouse ([dbdc576](https://github.com/masto182/HandG/commit/dbdc57624c8d541fe5a4256f36c15ace9f0931a4))
* start compiled Medusa server from .medusa/server; build shared-types to dist ([509d74b](https://github.com/masto182/HandG/commit/509d74b7dd4b19abbf245f13bd95314e2d61d078))
* stock-import variant guard; E2E start backend from .medusa/server ([664bf08](https://github.com/masto182/HandG/commit/664bf08bff694f989cba4b6355860a1ae1485837))
* **stock-import:** strip trailing % from ABV values before storing ([5b6a2be](https://github.com/masto182/HandG/commit/5b6a2be434431120680b02baf0ab3f3bcbac8933))
* **store:** filter sold-out products from related, brewery, and hops sections ([20f0005](https://github.com/masto182/HandG/commit/20f0005d53d80d31385d0ebbef98790411e13f9a))
* **store:** fix filters, freshness, list-view layout, and search sort ([54d3b1b](https://github.com/masto182/HandG/commit/54d3b1b018f73e1a2986ab86cb2c5faffe8a79dc))
* **store:** hide sold-out products by default; show disabled with badge when toggled ([86d16fc](https://github.com/masto182/HandG/commit/86d16fc80a84853cb65d821f9fe7a8188ae6f9ed))
* **store:** remount product grid on filter change + index packaged_at_ts ([8dc8497](https://github.com/masto182/HandG/commit/8dc849727ba33bd0dcc4ad05d63a7fd0460fd28e))
* **store:** use hydrated Medusa inventory for sold-out filtering, not stale MeiliSearch data ([95b112d](https://github.com/masto182/HandG/commit/95b112df9f2fd9b3546bd8489e7e2121812258d7))
* **tests:** add missing getBonusPointsInWindow + getLifetimeBonusPoints to vipScore mock ([aaee17a](https://github.com/masto182/HandG/commit/aaee17a1e10b8335433ada85910d575e29a88470))
* **tests:** make sequential integration tests self-contained for Medusa 2.17 ([b8e1c04](https://github.com/masto182/HandG/commit/b8e1c0446376916a56fca3e6c93eb6878c54646c))
* **tests:** mirror route's channel lookup in stock-import test setup ([2c64725](https://github.com/masto182/HandG/commit/2c64725691b1ccca32621cf34a7888896dbdef02))
* **tests:** use correct channel name in stock-import integration test setup ([f80a952](https://github.com/masto182/HandG/commit/f80a952d8b560b3eeea71d50daae62ed7d782bc7))
* wire sales channel + inventory on import; add seed pipeline to staging deploy ([6f2b2bb](https://github.com/masto182/HandG/commit/6f2b2bb55c9328374273a11d6276d14a2cb4ba22))


### Performance

* **typecheck:** break Zod v4 deep type chain, cut heap 8.2GB -&gt; 682MB ([4c3930d](https://github.com/masto182/HandG/commit/4c3930d63e515c7218c440b70675d688f9b534d2))


### Refactoring

* **migrations:** squash v1 custom module migrations to single baselines ([f632da9](https://github.com/masto182/HandG/commit/f632da9be53a4411ac1bc0a155a12744a7feba55))


### CI/CD

* create publishable key for storefront, fix wait check ([b90c82b](https://github.com/masto182/HandG/commit/b90c82bb291e283f9659f1f71c2c298a36929182))
* use standard medusa db:migrate in deploys; retire direct-SQL runner ([fdfb706](https://github.com/masto182/HandG/commit/fdfb7065959ee291c6823fdc837309a571222159))

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
