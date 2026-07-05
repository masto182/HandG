# Changelog

## [1.1.0](https://github.com/masto182/HandG/compare/v1.0.3...v1.1.0) (2026-07-05)


### Features

* **payments:** dynamic PayID hold hours and per-order extension ([4d0b7a3](https://github.com/masto182/HandG/commit/4d0b7a39f5e12990bb3f4040c3a8a8118a99d984))
* pre-prod readiness pass — remediation, QA fixes, deferred items ([aab052b](https://github.com/masto182/HandG/commit/aab052b1fa2406cc3d761f76ad6aaa1811db28fc))
* **stock-import:** wire description field, fix export gaps, surface validation errors ([9b43b05](https://github.com/masto182/HandG/commit/9b43b0534e4164ba6cec6ab40635ad599fa79980))
* **store:** convert hop origin filter to checkboxes driven by live facets ([75163db](https://github.com/masto182/HandG/commit/75163dbb670af0b42a780eb99ed74b6db65041d1))
* **storefront:** branded Open Graph + Twitter share cards ([69d82ce](https://github.com/masto182/HandG/commit/69d82ce1b5b0e437a04daf58e13fd5130b019262))
* **storefront:** complete mobile UX overhaul — phases 1–5 ([9f699d4](https://github.com/masto182/HandG/commit/9f699d4f8fdbd24448c8da2a79b675742c584882))
* **storefront:** multi-pill support, non-member blur, rich share modal, and OG tag improvement ([cf8e849](https://github.com/masto182/HandG/commit/cf8e849bf44f19b815d5c0f5f2084c53d398c41e))
* **storefront:** shared cart-error classifier for friendlier messages ([1283bb7](https://github.com/masto182/HandG/commit/1283bb77a8e8965d7ac836f446498930db6fa6bf))
* **storefront:** standardise pill colours and members-only blur ([0b14a2b](https://github.com/masto182/HandG/commit/0b14a2b34e41633d76d24246b6975cbe0012c32a))


### Bug Fixes

* approve-member metadata + apply form confirm password ([c37e1c3](https://github.com/masto182/HandG/commit/c37e1c330e64f01bfe32f5fd46f010a6286fb8c5))
* **auth:** normalize email to trimmed lowercase ([70e9dd6](https://github.com/masto182/HandG/commit/70e9dd68d34b2773611e5a6330f7eb3cc2236d55))
* **ci:** bake google maps api key into storefront image ([134ec3b](https://github.com/masto182/HandG/commit/134ec3bbcc8b223b9856d29ad459f1ffbd49fde9))
* **ci:** bake staging publishable API key into storefront image ([27aa002](https://github.com/masto182/HandG/commit/27aa002565afd32cfb9e87264bdd880e6a17eb8e))
* **ci:** disable MEDUSA_FF_INDEX_ENGINE — root cause of storeTotal=2 ([00c8e52](https://github.com/masto182/HandG/commit/00c8e52738a0e76804e737d573096d5e8c11b365))
* **ci:** reindex MeiliSearch after seeding — MEDUSA_FF_INDEX_ENGINE=true root cause ([5e1f4eb](https://github.com/masto182/HandG/commit/5e1f4eba86102bf7215be3ce94cc02cc0d45f383))
* **e2e:** complete admin member-approval confirm dialog + read tier on correct tab ([c56b38a](https://github.com/masto182/HandG/commit/c56b38a8aaa56d8d115238bf8e633a44efaa812c))
* **e2e:** consolidate stale deep-link checkout tests + repair logout helper ([9c24f1b](https://github.com/masto182/HandG/commit/9c24f1bd9461cbe5bfd7a4a97e77e469c0675c63))
* **e2e:** correct membership/theme locators + robust referral-code read ([41b5574](https://github.com/masto182/HandG/commit/41b5574485291333d97ea7de122136480620e1a6))
* **e2e:** eliminate networkidle flakiness + fix buy-at-price toggle and admin approve ([739e091](https://github.com/masto182/HandG/commit/739e091b83b3ae1a31ef92868c68b67f0dc6a2c8))
* **e2e:** explicitly link products to sales channel + several test fixes ([517557b](https://github.com/masto182/HandG/commit/517557bb5b0ce2088fffae43a5253fdb61754f10))
* **e2e:** fill confirm_password in apply() helper; add workflow-exempt markers ([4626366](https://github.com/masto182/HandG/commit/4626366a509ef89f7018b548b7e79a531a2d363a))
* **e2e:** fix 3 hop-origin filter tests + sdk-enforcement violation ([73e2c85](https://github.com/masto182/HandG/commit/73e2c85ae86c03905490b12097c1ac2793c4b992))
* **e2e:** green the nightly E2E suite ([7b73610](https://github.com/masto182/HandG/commit/7b7361051a9dc16a03ac550fc00586add123dae7))
* **e2e:** green the remaining nightly E2E failures and flaky test ([1c38ed5](https://github.com/masto182/HandG/commit/1c38ed596c45485d244a65e0beebce879bc3d916))
* **e2e:** make sdk-exempt markers survive prettier ([7cc6dda](https://github.com/masto182/HandG/commit/7cc6ddaaf97c84d4d9314924a28b22243cc771f0))
* **e2e:** match en-AU price format ($55 not A$55) in membership price checks ([f91b5f9](https://github.com/masto182/HandG/commit/f91b5f98a18c895b15cc344380195ac0f447901c))
* **e2e:** shipping prices, workflow-exempt comments, login assertion, theme toggle ([9c384fc](https://github.com/masto182/HandG/commit/9c384fc9d4bb18014d496f8981572d566e90a78b))
* **e2e:** wait for hop-country chip hydration before toggle-off ([94d83ec](https://github.com/masto182/HandG/commit/94d83eceaf7e1205bbcebe7aa9ebc4839a23f93d))
* enforce true 1:1 square on product image gallery ([1aecc68](https://github.com/masto182/HandG/commit/1aecc68b7f41bd369be1efaafc5fed9c7980036b))
* **orders:** fetch shipping_methods and show carrier-friendly name on order page ([c8ba68f](https://github.com/masto182/HandG/commit/c8ba68fd04c952172529da0a6f0af5c41ce9cf88))
* prevent pagination overflow on mobile viewports ([132b8f0](https://github.com/masto182/HandG/commit/132b8f045e7560f543e6c6e8bdfd70f2dc247061))
* **seo:** bake NEXT_PUBLIC_STORE_URL so sitemap/robots/JSON-LD use the canonical domain ([6167f62](https://github.com/masto182/HandG/commit/6167f6232e30d7baf64ebfd0c2eeb2897ba5fde1))
* serve private OCI bucket images via backend /files proxy ([2a80f46](https://github.com/masto182/HandG/commit/2a80f46bb767400ab7a57c9b36f347b27a0bf2bc))
* start compiled Medusa server from .medusa/server; build shared-types to dist ([509d74b](https://github.com/masto182/HandG/commit/509d74b7dd4b19abbf245f13bd95314e2d61d078))
* **store:** enable mobile filter panel via mobile prop on sticky-bar FilterPanel ([64efc12](https://github.com/masto182/HandG/commit/64efc12ad24d5215737f386e223284511dc9566d))
* **store:** fix filters, freshness, list-view layout, and search sort ([54d3b1b](https://github.com/masto182/HandG/commit/54d3b1b018f73e1a2986ab86cb2c5faffe8a79dc))
* storefront runner uses Next monorepo standalone layout ([be56570](https://github.com/masto182/HandG/commit/be565707db97c64802f9c59814eef97947bbaaf6))
* **storefront/ci:** add same-origin rewrite proxy for CI cross-origin auth ([9abbcb7](https://github.com/masto182/HandG/commit/9abbcb7ace1dafca4b13f2ba41e4b2f42e514de7))
* **storefront:** allow same-origin /files image host in next/image ([2401309](https://github.com/masto182/HandG/commit/240130961d9a16eeb9f549fd02b738b2d7c40d91))
* **storefront:** apply members-only blur to remaining product image surfaces ([90461a8](https://github.com/masto182/HandG/commit/90461a8cc5a9ccd1602226eb7b808e3ad8cdac27))
* **storefront:** mobile filter sheet — sticky header, fix iOS scroll ([15f87c8](https://github.com/masto182/HandG/commit/15f87c833f139c0a578c141e034b747c7d424a33))
* **storefront:** mobile layout improvements ([edb0fca](https://github.com/masto182/HandG/commit/edb0fca7a11a6b54399595af99f03a7a23c0073b))
* **storefront:** replace Medusa starter-template branding with Hops & Glory ([2ef5c62](https://github.com/masto182/HandG/commit/2ef5c6200ac5450d461a6d635946246a74c03537))
* **storefront:** use NEXT_PUBLIC_MEDUSA_BACKEND_URL for client-side SDK calls ([98d255c](https://github.com/masto182/HandG/commit/98d255c7c058e5808f646b393d8e887b1eb578d0))
* **store:** remount product grid on filter change + index packaged_at_ts ([8dc8497](https://github.com/masto182/HandG/commit/8dc849727ba33bd0dcc4ad05d63a7fd0460fd28e))
* use window.location.origin as SDK baseUrl in browser context ([fc3f67f](https://github.com/masto182/HandG/commit/fc3f67f53b4f36d03b458c7d8bac35d40440051b))


### CI/CD

* final fixes — step ordering, timeout, prod-smoke URL env var ([947a4b3](https://github.com/masto182/HandG/commit/947a4b3a8690d2b3d18d009d98a4c00d1da2907c))
* fix all 42 e2e nightly failures ([09011f0](https://github.com/masto182/HandG/commit/09011f02a7fdf42f0cfc598e281e23806db56322))
