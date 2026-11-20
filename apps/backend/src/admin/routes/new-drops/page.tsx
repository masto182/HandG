import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Table,
  Button,
  Input,
  Label,
  Badge,
  Text,
  Checkbox,
  Tabs,
  toast,
  usePrompt,
  FocusModal,
  Textarea,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { sdk } from "../../lib/sdk"

type BreweryGroupedItem = {
  brewery_id: string | null
  brewery_name: string | null
}

type QueueItem = BreweryGroupedItem & {
  queue_id: string
  product_id: string
  title: string
  handle: string | null
  thumbnail: string | null
  brewery_slug: string | null
  queued_at: string
  blockers: string[]
  warnings: string[]
}

type Batch = {
  id: string
  label: string | null
  status: "sending" | "sent" | "failed"
  product_count: number
  recipient_count: number
  email_delivery_count: number
  sent_count: number
  failed_count: number
  created_at: string
  sent_at: string | null
}

type PreviewRecipient = {
  customer_id: string
  customerLabel: string
  leadCategory: "hop_alerts" | "brewery_releases" | "new_drops" | null
  matchedBreweryNames: string[]
  matchedHopNames: string[]
  wantsInbox: boolean
  wantsEmail: boolean
  hasLoggedIn: boolean
  preferences: { category: string; enabled: boolean }[]
}

type PreviewResult = {
  productCount: number
  breweryNames: string[]
  readiness: Record<string, { blockers: string[]; warnings: string[] }>
  blockedProductIds: string[]
  uniqueCustomerCount: number
  inboxCount: number
  recipientsByLeadCategory: { hop_alerts: number; brewery_releases: number; new_drops: number }
  zeroRecipients: boolean
  recipients: PreviewRecipient[]
}

type RenderedPreview = { html: string; subject: string; leadCategory: string | null }

const GENERIC_PREVIEW_KEY = "__generic__"

const BLOCKER_LABELS: Record<string, string> = {
  product_not_found: "Product not found",
  not_published: "Not published",
  missing_handle: "Missing handle",
  release_date_in_future: "Release date is in the future",
  missing_image: "Missing image",
  no_variants: "No variants",
  no_calculated_price: "No price set",
  no_purchasable_stock: "No purchasable stock",
  no_sales_channel: "Not linked to a sales channel",
  sales_channel_not_linked_to_publishable_key: "Sales channel not linked to storefront key",
  no_shipping_profile: "Missing shipping profile",
}

const CATEGORY_LABELS: Record<string, string> = {
  hop_alerts: "Hop alerts",
  brewery_releases: "Brewery releases",
  new_drops: "All new releases",
}

function groupByBrewery<T extends BreweryGroupedItem>(items: T[]) {
  const map = new Map<string, { key: string; label: string; items: T[] }>()
  for (const item of items) {
    const key = item.brewery_id || "none"
    const label = item.brewery_name || "Other releases"
    const group = map.get(key) ?? { key, label, items: [] }
    group.items.push(item)
    map.set(key, group)
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function StatusBadge({ status }: { status: Batch["status"] }) {
  const color = status === "sent" ? "green" : status === "failed" ? "red" : "orange"
  const text = status === "sent" ? "Sent" : status === "failed" ? "Failed" : "Sending"
  return <Badge color={color as any}>{text}</Badge>
}

// Falls back to a plain placeholder box on a broken/404 image URL instead of
// the browser's default broken-image icon + cropped alt text.
function Thumbnail({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <div className="h-10 w-10 rounded bg-ui-bg-subtle" />
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-10 w-10 rounded object-cover"
      onError={() => setFailed(true)}
    />
  )
}

function ReviewSendModal({
  open,
  onOpenChange,
  selectedIds,
  onSent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  onSent: () => void
}) {
  const prompt = usePrompt()
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [label, setLabel] = useState("")
  const [introMessage, setIntroMessage] = useState("")
  const [subjectLine, setSubjectLine] = useState("")
  const [sending, setSending] = useState(false)
  const [conflictBlockers, setConflictBlockers] = useState<Record<
    string,
    { blockers: string[] }
  > | null>(null)
  const [selectedPreviewKey, setSelectedPreviewKey] = useState<string | null>(null)
  const [renderCache, setRenderCache] = useState<Record<string, RenderedPreview>>({})
  const [renderLoading, setRenderLoading] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [excludedCustomerIds, setExcludedCustomerIds] = useState<Set<string>>(new Set())

  const loadPreview = async () => {
    setLoading(true)
    setPreviewError(null)
    setConflictBlockers(null)
    try {
      const result = await sdk.client.fetch<PreviewResult>("/admin/new-drop-batches/preview", {
        method: "POST",
        body: { product_ids: selectedIds },
      })
      setPreview(result)

      const realRecipients = result.recipients.filter((r) => r.wantsEmail)
      selectPreviewRecipient(realRecipients[0]?.customer_id ?? GENERIC_PREVIEW_KEY)

      const labelParts = (["brewery_releases", "hop_alerts", "new_drops"] as const)
        .filter((cat) => result.recipientsByLeadCategory[cat] > 0)
        .map((cat) => `${CATEGORY_LABELS[cat]} (${result.recipientsByLeadCategory[cat]})`)
      setLabel(labelParts.join(", "))
    } catch {
      setPreviewError("Could not load a preview - try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setLabel("")
      setIntroMessage("")
      setSubjectLine("")
      setSelectedPreviewKey(null)
      setRenderCache({})
      setExcludedCustomerIds(new Set())
      loadPreview()
    } else {
      setPreview(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggleExcluded = (customerId: string) => {
    setExcludedCustomerIds((prev) => {
      const next = new Set(prev)
      if (next.has(customerId)) next.delete(customerId)
      else next.add(customerId)
      return next
    })
  }

  const selectPreviewRecipient = async (key: string, force = false) => {
    setSelectedPreviewKey(key)
    if (renderCache[key] && !force) return
    setRenderLoading(true)
    setRenderError(null)
    try {
      const result = await sdk.client.fetch<RenderedPreview>(
        "/admin/new-drop-batches/preview-render",
        {
          method: "POST",
          body: {
            product_ids: selectedIds,
            customer_id: key === GENERIC_PREVIEW_KEY ? null : key,
            intro_message: introMessage.trim() || null,
            subject: subjectLine.trim() || null,
          },
        }
      )
      setRenderCache((prev) => (force ? { [key]: result } : { ...prev, [key]: result }))
    } catch {
      setRenderError("Could not render this email - try again.")
    } finally {
      setRenderLoading(false)
    }
  }

  const activeRecipients = useMemo(
    () =>
      preview ? preview.recipients.filter((r) => !excludedCustomerIds.has(r.customer_id)) : [],
    [preview, excludedCustomerIds]
  )
  const activeEmailRecipients = activeRecipients.filter((r) => r.wantsEmail)
  const neverLoggedIn = useMemo(
    () => (preview ? preview.recipients.filter((r) => !r.hasLoggedIn) : []),
    [preview]
  )
  const activeInboxCount = activeRecipients.filter((r) => r.wantsInbox).length
  const activeUniqueCustomerCount = activeRecipients.length
  const activeRecipientsByLeadCategory = useMemo(() => {
    const tally = { hop_alerts: 0, brewery_releases: 0, new_drops: 0 }
    for (const r of activeEmailRecipients) {
      if (r.leadCategory) tally[r.leadCategory]++
    }
    return tally
  }, [activeEmailRecipients])
  const totalEmails = activeEmailRecipients.length
  const zeroActiveRecipients = activeUniqueCustomerCount === 0

  const handleSend = async () => {
    if (!preview || zeroActiveRecipients) return
    const categoriesWithRecipients = Object.values(activeRecipientsByLeadCategory).filter(
      (n) => n > 0
    ).length
    const confirmed = await prompt({
      title: "Send new drop batch",
      description: `This will send to ${activeUniqueCustomerCount} customer(s) - ${activeInboxCount} inbox notification(s) and ${
        totalEmails
      } personalized email(s) across ${categoriesWithRecipients} lead categor${
        categoriesWithRecipients === 1 ? "y" : "ies"
      }, for ${preview.productCount} product(s). This cannot be undone. Continue?`,
      confirmText: "Send",
      cancelText: "Cancel",
    })
    if (!confirmed) return

    setSending(true)
    try {
      await sdk.client.fetch("/admin/new-drop-batches", {
        method: "POST",
        body: {
          product_ids: selectedIds,
          label: label.trim() || null,
          intro_message: introMessage.trim() || null,
          subject: subjectLine.trim() || null,
          excluded_customer_ids: [...excludedCustomerIds],
        },
      })
      toast.success("Batch sent - it will finish dispatching over the next few minutes.")
      onOpenChange(false)
      onSent()
    } catch (err: any) {
      const body = err?.body ?? err
      if (body?.blockers) {
        setConflictBlockers(body.blockers)
        toast.error("Some products are no longer ready to send - see below.")
      } else if (body?.unclaimed_product_ids) {
        toast.error("Some products were just claimed by another batch - refresh and try again.")
        onOpenChange(false)
      } else {
        toast.error("Failed to send batch.")
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <Button
            size="small"
            onClick={handleSend}
            isLoading={sending}
            disabled={!preview || zeroActiveRecipients || loading}
          >
            Send batch
          </Button>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-y-6 px-6 py-6 max-w-2xl mx-auto w-full">
          <Heading level="h2">Review &amp; send</Heading>

          <div className="flex flex-col gap-y-2">
            <Label size="small">Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Tree House - August shipment"
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <Label size="small">Subject line (optional)</Label>
            <Input
              value={subjectLine}
              onChange={(e) => setSubjectLine(e.target.value)}
              onBlur={() => {
                if (selectedPreviewKey) selectPreviewRecipient(selectedPreviewKey, true)
              }}
              maxLength={200}
              placeholder="Blank = automatic, e.g. 'New releases from Tree House'"
            />
            <Text size="xsmall" className="text-ui-fg-subtle">
              Same subject for every recipient. The heading inside the email stays personalised.
            </Text>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label size="small">Update message (optional)</Label>
            <Textarea
              value={introMessage}
              onChange={(e) => setIntroMessage(e.target.value)}
              onBlur={() => {
                if (selectedPreviewKey) selectPreviewRecipient(selectedPreviewKey, true)
              }}
              rows={5}
              maxLength={2000}
              placeholder="Shown to every recipient under 'Hi {name},'. Blank line = new paragraph."
            />
            <Text size="xsmall" className="text-ui-fg-subtle">
              The preview updates when you click out of this box.
            </Text>
          </div>

          {loading ? (
            <Text size="small" className="text-ui-fg-subtle">
              Loading preview…
            </Text>
          ) : previewError ? (
            <div className="flex items-center gap-x-3">
              <Text size="small" className="text-ui-fg-error">
                {previewError}
              </Text>
              <Button size="small" variant="secondary" onClick={loadPreview}>
                Try again
              </Button>
            </div>
          ) : preview ? (
            <div className="flex flex-col gap-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Container className="p-3">
                  <Text size="small" className="text-ui-fg-subtle">
                    Products
                  </Text>
                  <Text weight="plus">{preview.productCount}</Text>
                </Container>
                <Container className="p-3">
                  <Text size="small" className="text-ui-fg-subtle">
                    Unique customers
                  </Text>
                  <Text weight="plus">{activeUniqueCustomerCount}</Text>
                </Container>
                <Container className="p-3">
                  <Text size="small" className="text-ui-fg-subtle">
                    Inbox notifications
                  </Text>
                  <Text weight="plus">{activeInboxCount}</Text>
                </Container>
                <Container className="p-3">
                  <Text size="small" className="text-ui-fg-subtle">
                    Emails (all categories)
                  </Text>
                  <Text weight="plus">{totalEmails}</Text>
                </Container>
              </div>

              <div className="flex flex-col gap-y-1">
                <Text size="small" weight="plus">
                  Recipients by lead reason
                </Text>
                {(["brewery_releases", "hop_alerts", "new_drops"] as const).map((cat) =>
                  activeRecipientsByLeadCategory[cat] > 0 ? (
                    <Text key={cat} size="small" className="text-ui-fg-subtle">
                      {CATEGORY_LABELS[cat]}: {activeRecipientsByLeadCategory[cat]}
                    </Text>
                  ) : null
                )}
              </div>

              {neverLoggedIn.length > 0 ? (
                <div className="flex items-center justify-between gap-x-2">
                  <Text size="small" className="text-ui-fg-subtle">
                    {neverLoggedIn.length} matched customers have never logged in
                  </Text>
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      setExcludedCustomerIds((prev) => {
                        const next = new Set(prev)
                        const allExcluded = neverLoggedIn.every((r) => next.has(r.customer_id))
                        neverLoggedIn.forEach((r) =>
                          allExcluded ? next.delete(r.customer_id) : next.add(r.customer_id)
                        )
                        return next
                      })
                    }}
                  >
                    {neverLoggedIn.every((r) => excludedCustomerIds.has(r.customer_id))
                      ? "Include never-logged-in"
                      : "Exclude never-logged-in"}
                  </Button>
                </div>
              ) : null}

              <div className="flex flex-col gap-y-2">
                <Text size="small" weight="plus">
                  Preview a recipient
                </Text>
                <div className="flex flex-col gap-y-1 max-h-48 overflow-y-auto border border-ui-border-base rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => selectPreviewRecipient(GENERIC_PREVIEW_KEY)}
                    className={`flex items-center justify-between gap-x-2 rounded-md px-2 py-1.5 text-left ${
                      selectedPreviewKey === GENERIC_PREVIEW_KEY
                        ? "bg-ui-bg-base-pressed"
                        : "hover:bg-ui-bg-subtle-hover"
                    }`}
                  >
                    <Text size="small" weight="plus">
                      Generic example (all new releases)
                    </Text>
                    <Badge size="2xsmall" color="grey">
                      no match
                    </Badge>
                  </button>
                  {preview.recipients
                    .filter((r) => r.wantsEmail)
                    .map((r) => {
                      const excluded = excludedCustomerIds.has(r.customer_id)
                      return (
                        <div
                          key={r.customer_id}
                          className={`flex items-center gap-x-2 rounded-md px-1 ${excluded ? "opacity-50" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => selectPreviewRecipient(r.customer_id)}
                            className={`flex flex-1 items-center justify-between gap-x-2 rounded-md px-2 py-1.5 text-left ${
                              selectedPreviewKey === r.customer_id
                                ? "bg-ui-bg-base-pressed"
                                : "hover:bg-ui-bg-subtle-hover"
                            }`}
                          >
                            <div className="flex flex-col">
                              <Text size="small" weight="plus">
                                {r.customerLabel}
                                {r.hasLoggedIn ? "" : " (never logged in)"}{" "}
                              </Text>
                              {r.matchedBreweryNames.length || r.matchedHopNames.length ? (
                                <Text size="xsmall" className="text-ui-fg-subtle">
                                  {[
                                    r.matchedBreweryNames.length
                                      ? `Breweries: ${r.matchedBreweryNames.join(", ")}`
                                      : null,
                                    r.matchedHopNames.length
                                      ? `Hops: ${r.matchedHopNames.join(", ")}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </Text>
                              ) : null}
                            </div>
                            <Badge size="2xsmall" color="green">
                              {r.leadCategory ? CATEGORY_LABELS[r.leadCategory] : "-"}
                            </Badge>
                          </button>
                          <Button
                            type="button"
                            size="small"
                            variant={excluded ? "secondary" : "transparent"}
                            onClick={() => toggleExcluded(r.customer_id)}
                          >
                            {excluded ? "Undo" : "Exclude"}
                          </Button>
                        </div>
                      )
                    })}
                  {preview.recipients.filter((r) => r.wantsEmail).length === 0 ? (
                    <Text size="small" className="text-ui-fg-subtle px-2 py-1.5">
                      No matched customers currently want email for this batch.
                    </Text>
                  ) : null}
                </div>
              </div>

              {selectedPreviewKey ? (
                <div className="flex flex-col gap-y-3">
                  {selectedPreviewKey !== GENERIC_PREVIEW_KEY ? (
                    <div className="flex flex-col gap-y-1">
                      <Text size="small" weight="plus">
                        Preferences
                      </Text>
                      <div className="flex gap-x-2">
                        {preview.recipients
                          .find((r) => r.customer_id === selectedPreviewKey)
                          ?.preferences.map((p) => (
                            <Badge
                              key={p.category}
                              size="2xsmall"
                              color={p.enabled ? "green" : "grey"}
                            >
                              {CATEGORY_LABELS[p.category] ?? p.category}:{" "}
                              {p.enabled ? "on" : "off"}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-y-1">
                    <Text size="small" weight="plus">
                      Rendered email
                    </Text>
                    {renderLoading ? (
                      <Text size="small" className="text-ui-fg-subtle">
                        Rendering…
                      </Text>
                    ) : renderError ? (
                      <div className="flex items-center gap-x-3">
                        <Text size="small" className="text-ui-fg-error">
                          {renderError}
                        </Text>
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => selectPreviewRecipient(selectedPreviewKey)}
                        >
                          Try again
                        </Button>
                      </div>
                    ) : renderCache[selectedPreviewKey] ? (
                      <>
                        <Text size="small" className="text-ui-fg-subtle">
                          Subject: {renderCache[selectedPreviewKey].subject}
                        </Text>
                        <iframe
                          title="Rendered email preview"
                          srcDoc={renderCache[selectedPreviewKey].html}
                          sandbox=""
                          className="w-full h-96 rounded-lg border border-ui-border-base bg-white"
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {preview.zeroRecipients ? (
                <Text size="small" className="text-ui-fg-error">
                  No customers currently match these products (no opt-ins found). Sending is
                  disabled - double check brewery follows / opt-in categories, or send anyway will
                  have no effect.
                </Text>
              ) : zeroActiveRecipients ? (
                <Text size="small" className="text-ui-fg-error">
                  All matched customers are excluded - sending is disabled. Undo an exclusion to
                  continue.
                </Text>
              ) : null}

              {preview.blockedProductIds.length > 0 || conflictBlockers ? (
                <div className="flex flex-col gap-y-1">
                  <Text size="small" weight="plus" className="text-ui-fg-error">
                    Not ready to send
                  </Text>
                  {Object.entries(conflictBlockers ?? preview.readiness)
                    .filter(([, r]) => r.blockers.length > 0)
                    .map(([productId, r]) => (
                      <Text key={productId} size="small" className="text-ui-fg-subtle">
                        {productId}: {r.blockers.map((b) => BLOCKER_LABELS[b] ?? b).join(", ")}
                      </Text>
                    ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

function PendingQueueTab() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reviewOpen, setReviewOpen] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const load = async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const { items: fetched } = await sdk.client.fetch<{ items: QueueItem[] }>(
        "/admin/new-drop-queue"
      )
      setItems(fetched)
      setLastRefreshed(new Date())
    } catch {
      if (!opts.silent) setError("Could not load the pending queue.")
    } finally {
      if (!opts.silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Only refetch when the tab becomes visible again (not on every
    // visibility toggle), and do it silently - never re-show the loading
    // skeleton or flicker the table just because the admin alt-tabbed away
    // and back while triaging the queue.
    const onVisible = () => {
      if (document.visibilityState === "visible") load({ silent: true })
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const groups = useMemo(() => groupByBrewery(items), [items])

  const toggleProduct = (productId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const toggleGroup = (groupItems: QueueItem[]) => {
    const ids = groupItems.filter((i) => i.blockers.length === 0).map((i) => i.product_id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
      return next
    })
  }

  const selectedItems = items.filter((i) => selected.has(i.product_id))
  const selectedBreweryCount = new Set(selectedItems.map((i) => i.brewery_id || "none")).size

  const handleSent = () => {
    setSelected(new Set())
    load()
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between">
        <Text size="small" className="text-ui-fg-subtle">
          {lastRefreshed ? `Last refreshed ${lastRefreshed.toLocaleTimeString()}` : ""}
        </Text>
        <Button size="small" variant="secondary" onClick={load}>
          Refresh
        </Button>
      </div>

      {selected.size > 0 && !reviewOpen ? (
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-ui-border-base bg-ui-bg-base px-4 py-3 shadow-elevation-flyout">
          <Text weight="plus">
            {selected.size} product{selected.size === 1 ? "" : "s"} from {selectedBreweryCount}{" "}
            brewer{selectedBreweryCount === 1 ? "y" : "ies"} selected
          </Text>
          <div className="flex gap-x-2">
            <Button size="small" variant="secondary" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button size="small" onClick={() => setReviewOpen(true)}>
              Review &amp; send
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <Container className="flex flex-col items-center gap-y-3 p-8">
          <Text className="text-ui-fg-error">{error}</Text>
          <Button size="small" variant="secondary" onClick={load}>
            Try again
          </Button>
        </Container>
      ) : loading ? (
        <Container className="p-8 text-center">
          <Text className="text-ui-fg-subtle">Loading…</Text>
        </Container>
      ) : items.length === 0 ? (
        <Container className="p-8 text-center">
          <Text className="text-ui-fg-subtle">
            No products pending - new drops appear here after import.
          </Text>
        </Container>
      ) : (
        groups.map((group) => {
          const selectableIds = group.items
            .filter((i) => i.blockers.length === 0)
            .map((i) => i.product_id)
          const allSelected =
            selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
          const someSelected = selectableIds.some((id) => selected.has(id))

          return (
            <Container key={group.key} className="p-0 overflow-hidden">
              <div className="flex items-center gap-x-3 border-b border-ui-border-base px-4 py-3">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={() => toggleGroup(group.items)}
                  disabled={selectableIds.length === 0}
                />
                <Text weight="plus">{group.label}</Text>
                <Badge size="2xsmall">{group.items.length}</Badge>
              </div>
              <Table>
                <Table.Body>
                  {group.items.map((item) => (
                    <Table.Row key={item.product_id}>
                      <Table.Cell className="w-10">
                        <Checkbox
                          checked={selected.has(item.product_id)}
                          disabled={item.blockers.length > 0}
                          onCheckedChange={() => toggleProduct(item.product_id)}
                        />
                      </Table.Cell>
                      <Table.Cell className="w-14">
                        <Thumbnail src={item.thumbnail} alt={item.title} />
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="small" weight="plus">
                          {item.title}
                        </Text>
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          Queued {new Date(item.queued_at).toLocaleDateString()}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1">
                          {item.blockers.map((b) => (
                            <Badge key={b} color="red" size="2xsmall">
                              {BLOCKER_LABELS[b] ?? b}
                            </Badge>
                          ))}
                          {item.warnings.map((w) => (
                            <Badge key={w} color="orange" size="2xsmall">
                              {w.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Container>
          )
        })
      )}

      <ReviewSendModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        selectedIds={[...selected]}
        onSent={handleSent}
      />
    </div>
  )
}

function HistoryTab() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { batches: fetched } = await sdk.client.fetch<{ batches: Batch[] }>(
        "/admin/new-drop-batches"
      )
      setBatches(fetched)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const hasSending = batches.some((b) => b.status === "sending")
    if (!hasSending) return
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches.some((b) => b.status === "sending")])

  const retryFailed = async (id: string) => {
    try {
      await sdk.client.fetch(`/admin/new-drop-batches/${id}`, {
        method: "POST",
        body: { action: "retry-failed" },
      })
      toast.success("Retrying failed deliveries.")
      load()
    } catch {
      toast.error("Failed to retry.")
    }
  }

  if (loading) {
    return (
      <Container className="p-8 text-center">
        <Text className="text-ui-fg-subtle">Loading…</Text>
      </Container>
    )
  }

  if (batches.length === 0) {
    return (
      <Container className="p-8 text-center">
        <Text className="text-ui-fg-subtle">No batches sent yet.</Text>
      </Container>
    )
  }

  return (
    <Container className="p-0 overflow-hidden">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Label</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Products</Table.HeaderCell>
            <Table.HeaderCell>Recipients</Table.HeaderCell>
            <Table.HeaderCell>Sent / Failed</Table.HeaderCell>
            <Table.HeaderCell>Sent at</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {batches.map((b) => (
            <Table.Row key={b.id}>
              <Table.Cell>{b.label || "(untitled)"}</Table.Cell>
              <Table.Cell>
                <StatusBadge status={b.status} />
              </Table.Cell>
              <Table.Cell>{b.product_count}</Table.Cell>
              <Table.Cell>{b.recipient_count}</Table.Cell>
              <Table.Cell>
                {b.sent_count} / {b.failed_count}
              </Table.Cell>
              <Table.Cell>{b.sent_at ? new Date(b.sent_at).toLocaleString() : "-"}</Table.Cell>
              <Table.Cell>
                {b.status === "failed" ? (
                  <Button size="small" variant="secondary" onClick={() => retryFailed(b.id)}>
                    Retry failed
                  </Button>
                ) : null}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

type SpecialsItem = {
  price_list_id: string
  product_id: string
  product_title: string
  product_handle: string
  product_thumbnail: string | null
  original_price: number
  discounted_price: number
  discount_type: "percentage" | "fixed"
  discount_value: number
  brewery_id: string | null
  brewery_name: string | null
}

type SpecialsRecipient = {
  customer_id: string
  label: string
  has_logged_in: boolean
  has_ordered: boolean
  is_active: boolean
  opted_out: boolean
}

type SpecialsPreviewResponse = {
  items: SpecialsItem[]
  itemCount: number
  recipientCount: number
}

type SpecialsRecipientsResponse = {
  recipients: SpecialsRecipient[]
}

type SpecialsRenderedPreview = {
  html: string
  text: string
  subject: string
}

type SpecialsBatch = {
  id: string
  label: string | null
  status: "sending" | "sent" | "failed"
  product_count: number
  recipient_count: number
  sent_count: number
  failed_count: number
  sent_at: string | null
}

const fmtAud = (amount: number) => `$${Number(amount).toFixed(2)}`

function SpecialsReviewSendModal({
  open,
  onOpenChange,
  selectedItems,
  onSent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: SpecialsItem[]
  onSent: () => void
}) {
  const prompt = usePrompt()
  const [recipients, setRecipients] = useState<SpecialsRecipient[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(false)
  const [recipientsError, setRecipientsError] = useState<string | null>(null)
  const [subjectLine, setSubjectLine] = useState("")
  const [message, setMessage] = useState("")
  const [skipInactive, setSkipInactive] = useState(true)
  const [manualExcludedCustomerIds, setManualExcludedCustomerIds] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<SpecialsRenderedPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewBlocked, setPreviewBlocked] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const selectedIds = useMemo(() => selectedItems.map((item) => item.product_id), [selectedItems])
  const selectedBreweryCount = useMemo(
    () => new Set(selectedItems.map((item) => item.brewery_id || "none")).size,
    [selectedItems]
  )
  const subjectPlaceholder =
    selectedItems.length === 1
      ? `On special: ${selectedItems[0].product_title}`
      : "This week's specials"

  const renderPreview = async () => {
    if (selectedIds.length === 0) return
    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewBlocked(null)
    try {
      const result = await sdk.client.fetch<SpecialsRenderedPreview>(
        "/admin/specials-batches/preview-render",
        {
          method: "POST",
          body: {
            product_ids: selectedIds,
            subject: subjectLine.trim() || null,
            message: message.trim() || null,
          },
        }
      )
      setPreview(result)
    } catch (err: any) {
      const body = err?.body
      if (err?.status === 409) {
        setPreviewBlocked(body?.message || "One or more selected specials are no longer available.")
      } else {
        setPreviewError("Could not render this email - try again.")
      }
      setPreview(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setRecipients([])
      setSubjectLine("")
      setMessage("")
      setSkipInactive(true)
      setManualExcludedCustomerIds(new Set())
      setPreview(null)
      setPreviewError(null)
      setPreviewBlocked(null)
      setRecipientsError(null)
      return
    }

    setRecipientsLoading(true)
    setRecipientsError(null)
    setSubjectLine("")
    setMessage("")
    setSkipInactive(true)
    setManualExcludedCustomerIds(new Set())
    ;(async () => {
      try {
        const { recipients: fetchedRecipients } =
          await sdk.client.fetch<SpecialsRecipientsResponse>("/admin/specials-batches/recipients")
        setRecipients(fetchedRecipients || [])
      } catch {
        setRecipientsError("Could not load recipients - try again.")
      } finally {
        setRecipientsLoading(false)
      }
    })()
    renderPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedIds.join(",")])

  const toggleManualExclude = (customerId: string) => {
    setManualExcludedCustomerIds((prev) => {
      const next = new Set(prev)
      if (next.has(customerId)) next.delete(customerId)
      else next.add(customerId)
      return next
    })
  }

  const inactiveExcludedCustomerIds = useMemo(
    () =>
      skipInactive
        ? recipients
            .filter((recipient) => !recipient.is_active)
            .map((recipient) => recipient.customer_id)
        : [],
    [recipients, skipInactive]
  )

  const excludedCustomerIds = useMemo(() => {
    const next = new Set(manualExcludedCustomerIds)
    inactiveExcludedCustomerIds.forEach((customerId) => next.add(customerId))
    return next
  }, [inactiveExcludedCustomerIds, manualExcludedCustomerIds])

  const emailRecipientCount = useMemo(
    () =>
      recipients.filter(
        (recipient) => !excludedCustomerIds.has(recipient.customer_id) && !recipient.opted_out
      ).length,
    [excludedCustomerIds, recipients]
  )

  const hasBlockingError = Boolean(previewBlocked)

  const handleSend = async () => {
    if (selectedIds.length === 0 || emailRecipientCount === 0 || hasBlockingError) return

    const confirmed = await prompt({
      title: "Send specials batch",
      description: `This will send ${selectedItems.length} special${
        selectedItems.length === 1 ? "" : "s"
      } from ${selectedBreweryCount} brewer${selectedBreweryCount === 1 ? "y" : "ies"} to ${emailRecipientCount} email recipient${emailRecipientCount === 1 ? "" : "s"}. This cannot be undone. Continue?`,
      confirmText: "Send",
      cancelText: "Cancel",
    })
    if (!confirmed) return

    setSending(true)
    try {
      await sdk.client.fetch("/admin/specials-batches", {
        method: "POST",
        body: {
          product_ids: selectedIds,
          subject: subjectLine.trim() || null,
          message: message.trim() || null,
          excluded_customer_ids: recipients
            .filter((recipient) => excludedCustomerIds.has(recipient.customer_id))
            .map((recipient) => recipient.customer_id),
        },
      })
      toast.success("Specials batch sent")
      onOpenChange(false)
      onSent()
    } catch (err: any) {
      const body = err?.body
      if (err?.status === 409) {
        setPreviewBlocked(body?.message || "One or more selected specials are no longer available.")
        toast.error(body?.message || "Could not send this batch.")
      } else {
        toast.error("Send failed")
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <Button
            size="small"
            onClick={handleSend}
            isLoading={sending}
            disabled={recipientsLoading || emailRecipientCount === 0 || hasBlockingError}
          >
            Send batch
          </Button>
        </FocusModal.Header>
        <FocusModal.Body className="mx-auto flex w-full max-w-2xl flex-col gap-y-6 px-6 py-6">
          <Heading level="h2">Review &amp; send</Heading>

          <div className="flex flex-col gap-y-2">
            <Label size="small">Subject line (optional)</Label>
            <Input
              value={subjectLine}
              onChange={(e) => setSubjectLine(e.target.value)}
              onBlur={renderPreview}
              maxLength={200}
              placeholder={subjectPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <Label size="small">Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={renderPreview}
              rows={5}
              maxLength={2000}
              placeholder="Add a short note about this week's specials..."
            />
            <Text size="xsmall" className="text-ui-fg-subtle">
              The preview updates when you click out of this box.
            </Text>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Container className="p-3">
              <Text size="small" className="text-ui-fg-subtle">
                Specials selected
              </Text>
              <Text weight="plus">{selectedItems.length}</Text>
            </Container>
            <Container className="p-3">
              <Text size="small" className="text-ui-fg-subtle">
                Breweries selected
              </Text>
              <Text weight="plus">{selectedBreweryCount}</Text>
            </Container>
            <Container className="p-3">
              <Text size="small" className="text-ui-fg-subtle">
                Recipients
              </Text>
              <Text weight="plus">{recipients.length}</Text>
            </Container>
            <Container className="p-3">
              <Text size="small" className="text-ui-fg-subtle">
                Emails that will be sent
              </Text>
              <Text weight="plus">{emailRecipientCount}</Text>
            </Container>
          </div>

          <div className="flex items-center justify-between gap-x-3 rounded-lg border border-ui-border-base px-4 py-3">
            <div className="flex flex-col gap-y-1">
              <Text size="small" weight="plus">
                Skip inactive
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                Excludes customers with no login on record and no orders.
              </Text>
            </div>
            <Checkbox
              checked={skipInactive}
              onCheckedChange={(checked) => setSkipInactive(checked === true)}
            />
          </div>

          <div className="flex flex-col gap-y-2">
            <Text size="small" weight="plus">
              Recipients
            </Text>
            {recipientsLoading ? (
              <Text size="small" className="text-ui-fg-subtle">
                Loading recipients…
              </Text>
            ) : recipientsError ? (
              <Text size="small" className="text-ui-fg-error">
                {recipientsError}
              </Text>
            ) : (
              <div className="flex max-h-72 flex-col gap-y-1 overflow-y-auto rounded-lg border border-ui-border-base p-1">
                {recipients.map((recipient) => {
                  const manuallyExcluded = manualExcludedCustomerIds.has(recipient.customer_id)
                  const inactiveExcluded = skipInactive && !recipient.is_active
                  const excluded = excludedCustomerIds.has(recipient.customer_id)

                  return (
                    <div
                      key={recipient.customer_id}
                      className={`flex items-center gap-x-3 rounded-md px-2 py-2 ${excluded ? "opacity-50" : ""}`}
                    >
                      <div className="flex flex-1 flex-col gap-y-1">
                        <Text size="small" weight="plus">
                          {recipient.label}
                        </Text>
                        <div className="flex flex-wrap gap-1">
                          {!recipient.is_active ? (
                            <Badge size="2xsmall" color="orange">
                              Inactive
                            </Badge>
                          ) : null}
                          {recipient.has_logged_in ? (
                            <Badge size="2xsmall" color="green">
                              Logged in
                            </Badge>
                          ) : null}
                          {recipient.has_ordered ? (
                            <Badge size="2xsmall" color="green">
                              Ordered
                            </Badge>
                          ) : null}
                          {recipient.opted_out ? (
                            <Badge size="2xsmall" color="grey">
                              Opted out of specials
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="small"
                        variant={manuallyExcluded ? "secondary" : "transparent"}
                        onClick={() => toggleManualExclude(recipient.customer_id)}
                        disabled={inactiveExcluded && !manuallyExcluded}
                      >
                        {manuallyExcluded ? "Undo" : inactiveExcluded ? "Excluded" : "Exclude"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-y-2">
            <Text size="small" weight="plus">
              Rendered email
            </Text>
            {previewLoading ? (
              <Text size="small" className="text-ui-fg-subtle">
                Rendering…
              </Text>
            ) : previewError ? (
              <div className="flex items-center gap-x-3">
                <Text size="small" className="text-ui-fg-error">
                  {previewError}
                </Text>
                <Button size="small" variant="secondary" onClick={renderPreview}>
                  Try again
                </Button>
              </div>
            ) : preview ? (
              <>
                <Text size="small" className="text-ui-fg-subtle">
                  Subject: {preview.subject}
                </Text>
                <iframe
                  title="Specials email preview"
                  srcDoc={preview.html}
                  sandbox=""
                  className="h-96 w-full rounded-lg border border-ui-border-base bg-white"
                />
              </>
            ) : null}
          </div>

          {previewBlocked ? (
            <Text size="small" className="text-ui-fg-error">
              {previewBlocked}
            </Text>
          ) : null}

          {emailRecipientCount === 0 && !recipientsLoading ? (
            <Text size="small" className="text-ui-fg-error">
              No recipients remain after exclusions and opt-outs. Sending is disabled.
            </Text>
          ) : null}
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

function SpecialsTab() {
  const [items, setItems] = useState<SpecialsItem[]>([])
  const [recipientCount, setRecipientCount] = useState(0)
  const [batches, setBatches] = useState<SpecialsBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reviewOpen, setReviewOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [preview, history] = await Promise.all([
        sdk.client.fetch<SpecialsPreviewResponse>("/admin/specials-batches/preview"),
        sdk.client.fetch<{ batches: SpecialsBatch[] }>("/admin/specials-batches"),
      ])
      setItems(preview.items || [])
      setRecipientCount(preview.recipientCount || 0)
      setBatches(history.batches || [])
    } catch {
      setError("Could not load specials.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const groups = useMemo(() => groupByBrewery(items), [items])

  const toggleProduct = (productId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const toggleGroup = (groupItems: SpecialsItem[]) => {
    const ids = groupItems.map((item) => item.product_id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
      return next
    })
  }

  const selectedItems = useMemo(
    () => items.filter((item) => selected.has(item.product_id)),
    [items, selected]
  )
  const selectedBreweryCount = useMemo(
    () => new Set(selectedItems.map((item) => item.brewery_id || "none")).size,
    [selectedItems]
  )

  const handleSent = () => {
    setSelected(new Set())
    load()
  }

  const retryFailed = async (id: string) => {
    try {
      await sdk.client.fetch(`/admin/specials-batches/${id}`, {
        method: "POST",
        body: { action: "retry-failed" },
      })
      toast.success("Retrying failed deliveries.")
      load()
    } catch {
      toast.error("Failed to retry.")
    }
  }

  if (loading) {
    return (
      <Container className="p-8 text-center">
        <Text className="text-ui-fg-subtle">Loading…</Text>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="flex flex-col items-center gap-y-3 p-8">
        <Text className="text-ui-fg-error">{error}</Text>
        <Button size="small" variant="secondary" onClick={load}>
          Try again
        </Button>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-y-6">
      {selected.size > 0 && !reviewOpen ? (
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-ui-border-base bg-ui-bg-base px-4 py-3 shadow-elevation-flyout">
          <Text weight="plus">
            {selected.size} special{selected.size === 1 ? "" : "s"} from {selectedBreweryCount}{" "}
            brewer
            {selectedBreweryCount === 1 ? "y" : "ies"} selected
          </Text>
          <div className="flex gap-x-2">
            <Button size="small" variant="secondary" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button size="small" onClick={() => setReviewOpen(true)}>
              Review &amp; send
            </Button>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <Container className="p-8 text-center">
          <Text className="text-ui-fg-subtle">Nothing is currently on special.</Text>
        </Container>
      ) : (
        <>
          <Text size="small" className="text-ui-fg-subtle">
            {recipientCount} recipient{recipientCount === 1 ? "" : "s"} currently opted in for
            specials.
          </Text>
          {groups.map((group) => {
            const groupIds = group.items.map((item) => item.product_id)
            const allSelected = groupIds.length > 0 && groupIds.every((id) => selected.has(id))
            const someSelected = groupIds.some((id) => selected.has(id))

            return (
              <Container key={group.key} className="overflow-hidden p-0">
                <div className="flex items-center gap-x-3 border-b border-ui-border-base px-4 py-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={() => toggleGroup(group.items)}
                  />
                  <Text weight="plus">{group.label}</Text>
                  <Badge size="2xsmall">{group.items.length}</Badge>
                </div>
                <Table>
                  <Table.Body>
                    {group.items.map((item) => (
                      <Table.Row key={item.product_id}>
                        <Table.Cell className="w-10">
                          <Checkbox
                            checked={selected.has(item.product_id)}
                            onCheckedChange={() => toggleProduct(item.product_id)}
                          />
                        </Table.Cell>
                        <Table.Cell className="w-14">
                          <Thumbnail src={item.product_thumbnail} alt={item.product_title} />
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="small" weight="plus">
                            {item.product_title}
                          </Text>
                        </Table.Cell>
                        <Table.Cell className="text-ui-fg-subtle line-through">
                          {fmtAud(item.original_price)}
                        </Table.Cell>
                        <Table.Cell className="font-medium">
                          {fmtAud(item.discounted_price)}
                        </Table.Cell>
                        <Table.Cell>
                          {item.discount_type === "percentage"
                            ? `${item.discount_value}% off`
                            : `${fmtAud(item.discount_value)} off`}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Container>
            )
          })}
        </>
      )}

      <div>
        <Text weight="plus" className="mb-2 block">
          Sending history
        </Text>
        {batches.length === 0 ? (
          <Text className="text-ui-fg-subtle">No specials batches sent yet.</Text>
        ) : (
          <Container className="p-0 overflow-hidden">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Products</Table.HeaderCell>
                  <Table.HeaderCell>Recipients</Table.HeaderCell>
                  <Table.HeaderCell>Sent / Failed</Table.HeaderCell>
                  <Table.HeaderCell>Sent at</Table.HeaderCell>
                  <Table.HeaderCell />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {batches.map((b) => (
                  <Table.Row key={b.id}>
                    <Table.Cell>
                      <StatusBadge status={b.status} />
                    </Table.Cell>
                    <Table.Cell>{b.product_count}</Table.Cell>
                    <Table.Cell>{b.recipient_count}</Table.Cell>
                    <Table.Cell>
                      {b.sent_count} / {b.failed_count}
                    </Table.Cell>
                    <Table.Cell>
                      {b.sent_at ? new Date(b.sent_at).toLocaleString() : "-"}
                    </Table.Cell>
                    <Table.Cell>
                      {b.status === "failed" ? (
                        <Button size="small" variant="secondary" onClick={() => retryFailed(b.id)}>
                          Retry failed
                        </Button>
                      ) : null}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Container>
        )}
      </div>

      <SpecialsReviewSendModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        selectedItems={selectedItems}
        onSent={handleSent}
      />
    </div>
  )
}

const NewDropsPage = () => {
  const [tab, setTab] = useState("pending")

  return (
    <Container className="p-6 flex flex-col gap-y-4">
      <Heading level="h1">New Drops</Heading>
      <Text className="text-ui-fg-subtle">
        Review newly imported beers, grouped by brewery, and send announcements when they're ready.
      </Text>
      <Tabs value={tab} onValueChange={setTab}>
        <Tabs.List>
          <Tabs.Trigger value="pending">Pending</Tabs.Trigger>
          <Tabs.Trigger value="history">Sending &amp; history</Tabs.Trigger>
          <Tabs.Trigger value="specials">Specials</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="pending" className="pt-4">
          <PendingQueueTab />
        </Tabs.Content>
        <Tabs.Content value="history" className="pt-4">
          <HistoryTab />
        </Tabs.Content>
        <Tabs.Content value="specials" className="pt-4">
          <SpecialsTab />
        </Tabs.Content>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "New Drops",
})

export default NewDropsPage
