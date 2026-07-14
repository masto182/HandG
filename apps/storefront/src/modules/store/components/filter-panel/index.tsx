"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { sdk } from "@lib/config"

type FacetDistribution = Record<string, Record<string, number>>

type FilterPanelProps = {
  facets?: FacetDistribution
  canSeePricing?: boolean
  /** When true, render the mobile trigger + full-screen portal panel.
      When false (default), render the inline desktop sidebar content. */
  mobile?: boolean
}

const FRESHNESS_BANDS = [
  { label: "< 30 days", value: "0-30" },
  { label: "30-60 days", value: "31-60" },
  { label: "60-90 days", value: "61-90" },
  { label: "90+ days", value: "91+" },
]

const ABV_RANGES = [
  { label: "Under 5%", value: "0-5" },
  { label: "5–7%", value: "5-7" },
  { label: "7–9%", value: "7-9" },
  { label: "9–11%", value: "9-11" },
  { label: "11%+", value: "11+" },
]

const STYLE_FAMILY_ORDER = ["IPA", "Pale Ale", "Dark", "Sour", "Lager"]

const INITIAL_SHOW = 6

export default function FilterPanel({
  facets: propFacets,
  canSeePricing,
  mobile = false,
}: FilterPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [baseFacets, setBaseFacets] = useState<FacetDistribution | undefined>(
    propFacets,
  )
  const [liveFacets, setLiveFacets] = useState<FacetDistribution | undefined>(
    propFacets,
  )
  const [fallbackBreweries, setFallbackBreweries] = useState<
    Record<string, number>
  >({})
  const [styleFamilies, setStyleFamilies] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const initialFetchDone = useRef(false)
  const scrollLockRef = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [searchParams])

  // Lock body scroll when sheet is open (iOS-safe position:fixed pattern)
  useEffect(() => {
    if (mobileOpen) {
      scrollLockRef.current = window.scrollY
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollLockRef.current}px`
      document.body.style.width = "100%"
      document.body.style.overflow = "hidden"
    } else {
      const restoreY = scrollLockRef.current
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.width = ""
      document.body.style.overflow = ""
      window.scrollTo(0, restoreY)
    }
    return () => {
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.width = ""
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  useEffect(() => {
    sdk.client
      .fetch<{ families: string[] }>("/store/beer-styles", { method: "GET" })
      .then((d) => {
        if (Array.isArray(d.families) && d.families.length > 0) {
          const ordered = [
            ...STYLE_FAMILY_ORDER.filter((f) => d.families.includes(f)),
            ...d.families.filter((f) => !STYLE_FAMILY_ORDER.includes(f)),
          ]
          setStyleFamilies(ordered)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    sdk.client
      .fetch<{ breweries: any[] }>("/store/breweries", { method: "GET" })
      .then((d) => {
        if (d.breweries && d.breweries.length > 0) {
          sdk.client
            .fetch<{ products: any[] }>(
              "/store/products?limit=200&fields=metadata,+metadata",
              { method: "GET" },
            )
            .then((pd) => {
              const breweryFacets: Record<string, number> = {}
              ;(pd.products || []).forEach((p: any) => {
                const name = p.metadata?.brewery_name
                if (name) breweryFacets[name] = (breweryFacets[name] || 0) + 1
              })
              if (Object.keys(breweryFacets).length > 0) {
                setFallbackBreweries(breweryFacets)
              } else {
                d.breweries.forEach((b: any) => {
                  breweryFacets[b.name] = 1
                })
                setFallbackBreweries(breweryFacets)
              }
            })
            .catch(() => {
              const breweryFacets: Record<string, number> = {}
              d.breweries.forEach((b: any) => {
                breweryFacets[b.name] = 1
              })
              setFallbackBreweries(breweryFacets)
            })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!initialFetchDone.current) {
      const ctrl = new AbortController()
      sdk.client
        .fetch<any>("/store/search?available=true", {
          method: "GET",
          signal: ctrl.signal,
        })
        .then((d) => {
          if (!ctrl.signal.aborted) {
            setBaseFacets(d.facetDistribution)
            setLiveFacets(d.facetDistribution)
            initialFetchDone.current = true
          }
        })
        .catch(() => {})
      return () => ctrl.abort()
    }
  }, [])

  useEffect(() => {
    if (!initialFetchDone.current) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    if (!params.has("available")) params.set("available", "true")
    sdk.client
      .fetch<any>(`/store/search?${params.toString()}`, {
        method: "GET",
        signal: ctrl.signal,
      })
      .then((d) => {
        if (!ctrl.signal.aborted) setLiveFacets(d.facetDistribution)
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [searchParams])

  const getParam = (key: string): string[] => {
    const val = searchParams.get(key)
    return val ? val.split(",") : []
  }

  const selectedBreweries = getParam("brewery")
  const selectedStyles = getParam("style")
  const selectedFreshness = getParam("freshness")
  const selectedHops = getParam("hops")
  const selectedHopCountry = getParam("hop_country")
  const selectedAbv = getParam("abv")
  const selectedTags = getParam("tags")
  const hopsMode = searchParams.get("hopsMode") || "or"
  const selectedCollab = searchParams.get("collab") === "true"
  const selectedOnSale = searchParams.get("on_sale") === "true"
  const selectedAvailable = searchParams.get("available") !== "false"

  const activeCount =
    selectedBreweries.length +
    selectedStyles.length +
    selectedAbv.length +
    selectedFreshness.length +
    selectedHops.length +
    selectedHopCountry.length +
    selectedTags.length +
    (selectedCollab ? 1 : 0) +
    (selectedOnSale ? 1 : 0)

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete("page")
      // When no filters remain, push the bare pathname. Pushing `${pathname}?`
      // (trailing "?" with an empty query) is treated as the current URL by the
      // App Router and silently no-ops — which made removing the last filter
      // (e.g. toggling off the only hop-origin chip) appear broken.
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const toggleArrayParam = useCallback(
    (key: string, item: string) => {
      const current = getParam(key)
      const next = current.includes(item)
        ? current.filter((v) => v !== item)
        : [...current, item]
      updateParams(key, next.length ? next.join(",") : null)
    },
    [searchParams, updateParams],
  )

  const baseBreweryFacets =
    Object.keys(baseFacets?.brewery || {}).length > 0
      ? baseFacets!.brewery
      : fallbackBreweries
  const baseStyleFacets = baseFacets?.style_family || {}
  const baseHopsFacets = baseFacets?.hops || {}
  const baseHopCountryFacets = baseFacets?.hop_countries || {}

  const liveBreweryFacets =
    Object.keys(liveFacets?.brewery || {}).length > 0
      ? liveFacets!.brewery
      : fallbackBreweries
  const liveStyleFacets = liveFacets?.style_family || {}
  const liveHopsFacets = liveFacets?.hops || {}
  const liveHopCountryFacets = liveFacets?.hop_countries || {}

  const sortedBreweries = Object.entries(baseBreweryFacets)
    .map(
      (entry) =>
        [entry[0], liveBreweryFacets[entry[0]] ?? entry[1]] as [string, number],
    )
    .sort((a, b) => b[1] - a[1])

  const sortedHops = Object.entries(baseHopsFacets).sort((a, b) => b[1] - a[1])

  const [breweryExpanded, setBreweryExpanded] = useState(false)
  const visibleBreweries = breweryExpanded
    ? sortedBreweries
    : sortedBreweries.slice(0, INITIAL_SHOW)

  const [hopsExpanded, setHopsExpanded] = useState(false)
  const visibleHops = hopsExpanded
    ? sortedHops
    : sortedHops.slice(0, INITIAL_SHOW)

  const checkboxClass =
    "appearance-none w-4 h-4 rounded-sm bg-hl-surface3 border border-hg-text-muted mr-3 checked:bg-hg-gold checked:border-hg-gold focus:ring-2 focus:ring-hg-gold/20 relative after:content-[''] after:absolute after:inset-0 after:flex after:items-center after:justify-center checked:after:content-['✓'] after:text-[10px] after:text-hg-on-primary after:font-bold after:leading-4 after:text-center cursor-pointer flex-shrink-0"

  const renderFilterSections = (openByDefault: boolean) => (
    <>
      <details
        className="group border-b border-hg-border pb-4"
        {...(openByDefault ? { open: true } : {})}
      >
        <summary className="flex justify-between items-center cursor-pointer list-none">
          <h3 className="font-semibold text-[12px] text-hg-text-muted uppercase tracking-widest">
            {canSeePricing ? "Brewery" : "Producer"}
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-hg-text-muted group-open:rotate-180 transition-transform"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="space-y-3 mt-4">
          {visibleBreweries.map(([name]) => {
            const isActive = selectedBreweries.includes(name)
            return (
              <label
                key={name}
                className="flex items-center group/item cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => toggleArrayParam("brewery", name)}
                  className={checkboxClass}
                />
                <span
                  className={`text-[14px] ${
                    isActive ? "text-hg-text" : "text-hg-text-secondary"
                  } group-hover/item:text-hg-gold transition-colors`}
                >
                  {name}
                </span>
              </label>
            )
          })}
          {sortedBreweries.length > INITIAL_SHOW && !breweryExpanded && (
            <button
              onClick={() => setBreweryExpanded(true)}
              className="text-[10px] font-semibold text-hg-gold hover:underline flex items-center mt-2 uppercase tracking-widest"
            >
              SHOW MORE
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="ml-1"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
        </div>
      </details>

      {canSeePricing && (
        <details
          className="group border-b border-hg-border py-4"
          {...(openByDefault ? { open: true } : {})}
        >
          <summary className="flex justify-between items-center cursor-pointer list-none">
            <h3 className="font-semibold text-[12px] text-hg-text-muted uppercase tracking-widest">
              Style
            </h3>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-hg-text-muted group-open:rotate-180 transition-transform"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <div className="space-y-3 mt-4">
            {styleFamilies.map((fam) => {
              const isActive = selectedStyles.includes(fam)
              const count = liveStyleFacets[fam] ?? baseStyleFacets[fam] ?? 0
              return (
                <label
                  key={fam}
                  className="flex items-center group/item cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => toggleArrayParam("style", fam)}
                    className={checkboxClass}
                  />
                  <span
                    className={`text-[14px] flex-1 ${
                      isActive ? "text-hg-text" : "text-hg-text-secondary"
                    } group-hover/item:text-hg-gold transition-colors`}
                  >
                    {fam}
                  </span>
                  {count > 0 && (
                    <span className="text-xs text-hg-text-muted ml-2">
                      {count}
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </details>
      )}

      {canSeePricing && (
        <details
          className="group border-b border-hg-border py-4"
          {...(openByDefault ? { open: true } : {})}
        >
          <summary className="flex justify-between items-center cursor-pointer list-none">
            <h3 className="font-semibold text-[12px] text-hg-text-muted uppercase tracking-widest">
              ABV %
            </h3>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-hg-text-muted group-open:rotate-180 transition-transform"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <div className="space-y-3 mt-4">
            {ABV_RANGES.map((range) => {
              const isActive = selectedAbv.includes(range.value)
              return (
                <label
                  key={range.value}
                  className="flex items-center group/item cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => toggleArrayParam("abv", range.value)}
                    className={checkboxClass}
                  />
                  <span
                    className={`text-[14px] ${
                      isActive ? "text-hg-text" : "text-hg-text-secondary"
                    } group-hover/item:text-hg-gold transition-colors`}
                  >
                    {range.label}
                  </span>
                </label>
              )
            })}
          </div>
        </details>
      )}

      <details
        className="group border-b border-hg-border py-4"
        {...(openByDefault ? { open: true } : {})}
      >
        <summary className="flex justify-between items-center cursor-pointer list-none">
          <h3 className="font-semibold text-[12px] text-hg-text-muted uppercase tracking-widest">
            Freshness
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-hg-text-muted group-open:rotate-180 transition-transform"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="space-y-3 mt-4">
          {FRESHNESS_BANDS.map((band) => {
            const isActive = selectedFreshness.includes(band.value)
            return (
              <label
                key={band.value}
                className="flex items-center group/item cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => toggleArrayParam("freshness", band.value)}
                  className={checkboxClass}
                />
                <span
                  className={`text-[14px] ${
                    isActive ? "text-hg-text" : "text-hg-text-secondary"
                  } group-hover/item:text-hg-gold transition-colors`}
                >
                  {band.label}
                </span>
              </label>
            )
          })}
        </div>
      </details>

      <details
        className="group border-b border-hg-border py-4"
        {...(openByDefault ? { open: true } : {})}
      >
        <summary className="flex justify-between items-center cursor-pointer list-none">
          <h3 className="font-semibold text-[12px] text-hg-text-muted uppercase tracking-widest">
            Hops
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-hg-text-muted group-open:rotate-180 transition-transform"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="mt-4">
          <div className="flex bg-hl-surface3/50 rounded p-1 mb-4 border border-hl-border-strong">
            <button
              onClick={() => updateParams("hopsMode", "and")}
              className={`flex-1 py-1 text-[10px] font-semibold uppercase tracking-widest rounded ${
                hopsMode === "and"
                  ? "bg-hg-gold text-hg-on-primary shadow-sm"
                  : "text-hg-text-muted hover:text-hg-text"
              }`}
            >
              AND
            </button>
            <button
              onClick={() => updateParams("hopsMode", "or")}
              className={`flex-1 py-1 text-[10px] font-semibold uppercase tracking-widest rounded ${
                hopsMode === "or"
                  ? "bg-hg-gold text-hg-on-primary shadow-sm"
                  : "text-hg-text-muted hover:text-hg-text"
              }`}
            >
              OR
            </button>
          </div>
          <div className="space-y-3">
            {visibleHops.map(([name]) => {
              const isActive = selectedHops.includes(name)
              return (
                <label
                  key={name}
                  className="flex items-center group/item cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => toggleArrayParam("hops", name)}
                    className={checkboxClass}
                  />
                  <span
                    className={`text-[14px] flex-1 ${
                      isActive ? "text-hg-text" : "text-hg-text-secondary"
                    } group-hover/item:text-hg-gold transition-colors`}
                  >
                    {name}
                  </span>
                </label>
              )
            })}
            {sortedHops.length > INITIAL_SHOW && !hopsExpanded && (
              <button
                onClick={() => setHopsExpanded(true)}
                className="text-[10px] font-semibold text-hg-gold hover:underline flex items-center mt-2 uppercase tracking-widest"
              >
                SHOW MORE
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="ml-1"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}
            {hopsExpanded && (
              <button
                onClick={() => setHopsExpanded(false)}
                className="text-[10px] font-semibold text-hg-gold hover:underline flex items-center mt-2 uppercase tracking-widest"
              >
                SHOW LESS
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="ml-1"
                >
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </details>

      <details
        className="group py-4"
        {...(openByDefault ? { open: true } : {})}
      >
        <summary className="flex justify-between items-center cursor-pointer list-none">
          <h3 className="font-semibold text-[12px] text-hg-text-muted uppercase tracking-widest">
            Hop Origin
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-hg-text-muted group-open:rotate-180 transition-transform"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="space-y-3 mt-4">
          {Object.entries(baseHopCountryFacets)
            .filter(([, baseCount]) => baseCount > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([code, baseCount]) => {
              const label: Record<string, string> = {
                NZ: "New Zealand",
                AU: "Australia",
                US: "United States",
                EU: "Europe",
              }
              const isActive = selectedHopCountry.includes(code)
              const count = liveHopCountryFacets[code] ?? baseCount
              return (
                <label
                  key={code}
                  className="flex items-center group/item cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => toggleArrayParam("hop_country", code)}
                    className={checkboxClass}
                  />
                  <span
                    className={`text-[14px] flex-1 ${
                      isActive ? "text-hg-text" : "text-hg-text-secondary"
                    } group-hover/item:text-hg-gold transition-colors`}
                  >
                    {label[code] ?? code}
                  </span>
                  {count > 0 && (
                    <span className="text-xs text-hg-text-muted ml-2">
                      {count}
                    </span>
                  )}
                </label>
              )
            })}
        </div>
      </details>

      <details
        className="group py-4"
        {...(openByDefault ? { open: true } : {})}
      >
        <summary className="flex justify-between items-center cursor-pointer list-none">
          <h3 className="font-semibold text-[12px] text-hg-text-muted uppercase tracking-widest">
            Special Filters
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-hg-text-muted group-open:rotate-180 transition-transform"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="space-y-3 mt-4">
          <label className="flex items-center group/item cursor-pointer">
            <input
              type="checkbox"
              checked={selectedOnSale}
              onChange={() =>
                updateParams("on_sale", selectedOnSale ? null : "true")
              }
              className={checkboxClass}
            />
            <span
              className={`text-[14px] ${
                selectedOnSale ? "text-hg-text" : "text-hg-text-secondary"
              } group-hover/item:text-hg-gold transition-colors`}
            >
              On Sale
            </span>
          </label>
          <label className="flex items-center group/item cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTags.includes("anniversary")}
              onChange={() => toggleArrayParam("tags", "anniversary")}
              className={checkboxClass}
            />
            <span
              className={`text-[14px] ${
                selectedTags.includes("anniversary")
                  ? "text-hg-text"
                  : "text-hg-text-secondary"
              } group-hover/item:text-hg-gold transition-colors`}
            >
              Anniversary
            </span>
          </label>
          <label className="flex items-center group/item cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCollab}
              onChange={() =>
                updateParams("collab", selectedCollab ? null : "true")
              }
              className={checkboxClass}
            />
            <span
              className={`text-[14px] ${
                selectedCollab ? "text-hg-text" : "text-hg-text-secondary"
              } group-hover/item:text-hg-gold transition-colors`}
            >
              Collaborations
            </span>
          </label>
          <label className="flex items-center group/item cursor-pointer">
            <input
              type="checkbox"
              checked={!selectedAvailable}
              onChange={() =>
                updateParams("available", selectedAvailable ? "false" : null)
              }
              className={checkboxClass}
            />
            <span
              className={`text-[14px] ${
                !selectedAvailable ? "text-hg-text" : "text-hg-text-secondary"
              } group-hover/item:text-hg-gold transition-colors`}
            >
              Include Sold Out
            </span>
          </label>
        </div>
      </details>
    </>
  )

  // Desktop sidebar instance: render the inline sections only. The parent
  // <aside> controls visibility; no trigger or portal here.
  if (!mobile) {
    return <div className="space-y-2">{renderFilterSections(true)}</div>
  }

  return (
    <>
      {/* Mobile trigger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden flex items-center gap-1.5 px-3 py-2 border border-hg-border rounded-lg text-xs text-hg-text-muted shrink-0"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
        </svg>
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="flex items-center justify-center w-4 h-4 bg-hg-gold text-hg-on-primary text-[9px] font-bold rounded-full leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {/* Mobile full-screen filter panel — portaled to body so it escapes the
          sticky bar's backdrop-filter containing block (which otherwise traps
          the fixed overlay inside the thin header strip). */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[100] md:hidden bg-hg-bg flex flex-col transition-transform duration-300 ${
              mobileOpen
                ? "translate-y-0"
                : "translate-y-full pointer-events-none"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            {/* Header */}
            <div
              className="flex-shrink-0 px-5 flex items-center justify-between border-b border-hg-border"
              style={{
                paddingTop: "max(env(safe-area-inset-top), 1rem)",
                paddingBottom: "1rem",
              }}
            >
              <h2 className="text-base font-bold text-hg-text">
                Filters
                {activeCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-hg-text-secondary">
                    ({activeCount} active)
                  </span>
                )}
              </h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-hg-text-muted hover:text-hg-text transition-colors p-2.5 -mr-1"
                aria-label="Close filters"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable filter content */}
            <div className="overflow-y-auto w-full flex-1 min-h-0 px-5 py-2">
              {renderFilterSections(false)}
            </div>

            {/* Footer actions */}
            <div
              className="flex-shrink-0 flex items-center gap-3 px-5 pt-4 border-t border-hg-border bg-hg-bg"
              style={{
                paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
              }}
            >
              <button
                onClick={() => router.push(pathname, { scroll: false })}
                disabled={activeCount === 0}
                className="flex-shrink-0 px-4 py-3 text-sm font-semibold text-hg-text-muted hover:text-hg-text disabled:opacity-40 transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex-1 py-3 rounded-lg bg-hg-gold text-hg-on-primary text-sm font-bold uppercase tracking-widest"
              >
                Show results
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
