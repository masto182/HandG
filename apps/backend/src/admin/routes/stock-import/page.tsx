import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Textarea,
  Checkbox,
  Label,
  Badge,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useState, useRef } from "react"
import { sdk } from "../../lib/sdk"

// ─── CSV Import types ─────────────────────────────────────────────────────────

type DryRunRow = {
  row: number
  name: string
  action: "create" | "update" | "error"
  messages: string[]
  changes?: Record<string, any>
}

type PreviewResult = {
  dry_run: true
  would_create: number
  would_update: number
  would_auto_create_breweries: string[]
  would_auto_create_hops: string[]
  errors: string[]
  rows: DryRunRow[]
  total: number
}

type CommitResult = {
  created: number
  updated: number
  errors: string[]
  auto_created_breweries: string[]
  auto_created_hops: string[]
  total: number
}

// ─── Image Upload types ───────────────────────────────────────────────────────

type ValidateRow = {
  filename: string
  handle: string
  url: string
  status: "matched" | "no_match" | "already_has_image"
  product_id?: string
  product_title?: string
  existing_thumbnail?: string
}

type ValidateResult = {
  images: ValidateRow[]
  matched: number
  already_has_image: number
  no_match: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS =
  "name, brewery, style, abv, price, compare_at_price, stock, container, volume_ml, comment, collab_breweries, hops, images, release_at, is_anniversary"

const SAMPLE =
  'name,brewery,style,abv,price,compare_at_price,stock,container,volume_ml,collab_breweries,hops,images,release_at,is_anniversary\nStatus Quo DIPA,Mountain Culture Beer Co,Double IPA,8.0,12,15,24,Can 440ml,440,,"Citra,Mosaic","https://cdn.example.com/sq.jpg",2026-06-01T18:00:00+10:00,false'

const ACTION_BADGE: Record<string, { label: string; color: "green" | "blue" | "red" }> = {
  create: { label: "Create", color: "green" },
  update: { label: "Update", color: "blue" },
  error: { label: "Error", color: "red" },
}

const IMG_STATUS_BADGE: Record<
  ValidateRow["status"],
  { label: string; color: "green" | "grey" | "orange" }
> = {
  matched: { label: "Matched", color: "green" },
  no_match: { label: "No match", color: "grey" },
  already_has_image: { label: "Has image", color: "orange" },
}

// ─── File status indicator ────────────────────────────────────────────────────

type FileStatus = "uploading" | "done" | "error"

function FileStatusBadge({ status }: { status: FileStatus }) {
  if (status === "uploading") {
    return (
      <span className="flex items-center gap-1 text-xs text-ui-fg-muted">
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Uploading…
      </span>
    )
  }
  if (status === "done") {
    return <span className="text-xs text-ui-tag-green-text">✓ Uploaded</span>
  }
  return <span className="text-xs text-ui-fg-error">✗ Error</span>
}

// ─── Main page ────────────────────────────────────────────────────────────────

const StockImportPage = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<"csv" | "images">("csv")

  // ── CSV Import state ────────────────────────────────────────────────────────
  const [step, setStep] = useState<"source" | "preview" | "done">("source")
  const [csv, setCsv] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [autoBreweries, setAutoBreweries] = useState(false)
  const [autoHops, setAutoHops] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [commit, setCommit] = useState<CommitResult | null>(null)
  const [filter, setFilter] = useState<"all" | "create" | "update" | "error">("all")
  const inputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)

  // ── Image Upload state ──────────────────────────────────────────────────────
  const [imgStep, setImgStep] = useState<"upload" | "preview" | "done">("upload")
  const [stagedImages, setStagedImages] = useState<Array<{ filename: string; url: string }>>([])
  const [imgProgress, setImgProgress] = useState<Record<string, FileStatus>>({})
  const [imgPreview, setImgPreview] = useState<ValidateResult | null>(null)
  const [imgCommitResult, setImgCommitResult] = useState<{
    updated: number
    errors: string[]
  } | null>(null)
  const [imgFilter, setImgFilter] = useState<"all" | ValidateRow["status"]>("all")
  const [imgOverwrites, setImgOverwrites] = useState<Set<string>>(new Set())
  const [imgDragOver, setImgDragOver] = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)

  // ── CSV helpers ─────────────────────────────────────────────────────────────

  const options = () => ({
    auto_create_breweries: autoBreweries,
    auto_create_hops: autoHops,
  })

  const readFile = async (file: File) => {
    const text = await file.text()
    setCsv(text)
    setFileName(file.name)
  }

  const runPreview = async () => {
    if (!csv.trim()) {
      toast.error("Add CSV data first")
      return
    }
    setLoading(true)
    try {
      const data = await sdk.client.fetch<PreviewResult>("/admin/stock-import", {
        method: "POST",
        body: { csv, options: { ...options(), dry_run: true } },
      })
      setPreview(data)
      setFilter("all")
      setStep("preview")
    } catch (e: any) {
      toast.error(e?.message || "Preview failed")
    } finally {
      setLoading(false)
    }
  }

  const runCommit = async () => {
    setLoading(true)
    try {
      const data = await sdk.client.fetch<CommitResult>("/admin/stock-import", {
        method: "POST",
        body: { csv, options: { ...options(), dry_run: false } },
      })
      setCommit(data)
      setStep("done")
      toast.success(`Imported: ${data.created} created, ${data.updated} updated`)
    } catch (e: any) {
      toast.error(e?.message || "Import failed")
    } finally {
      setLoading(false)
    }
  }

  const resetCsv = () => {
    setStep("source")
    setCsv("")
    setFileName(null)
    setPreview(null)
    setCommit(null)
  }

  const exportCatalogue = async (loadIntoEditor: boolean) => {
    setExporting(true)
    try {
      const data = await sdk.client.fetch<{ csv: string; count: number }>("/admin/stock-import")
      if (loadIntoEditor) {
        setCsv(data.csv)
        setFileName(null)
        toast.success(`Loaded ${data.count} products into the editor`)
      } else {
        const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `handg-stock-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        toast.success(`Exported ${data.count} products`)
      }
    } catch (e: any) {
      toast.error(e?.message || "Export failed")
    } finally {
      setExporting(false)
    }
  }

  // ── Image helpers ───────────────────────────────────────────────────────────

  const handleImageFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name))
    if (!fileArr.length) {
      toast.error("Only JPEG, PNG, or WebP files accepted")
      return
    }
    for (const file of fileArr) {
      setImgProgress((p) => ({ ...p, [file.name]: "uploading" }))
      try {
        const result = await (sdk.admin.upload as any).create({ files: [file] })
        const url = result?.files?.[0]?.url
        if (!url) throw new Error("No URL returned")
        setStagedImages((s) => {
          // Replace if filename already staged (re-upload)
          const existing = s.findIndex((i) => i.filename === file.name)
          if (existing >= 0) {
            const next = [...s]
            next[existing] = { filename: file.name, url }
            return next
          }
          return [...s, { filename: file.name, url }]
        })
        setImgProgress((p) => ({ ...p, [file.name]: "done" }))
      } catch {
        setImgProgress((p) => ({ ...p, [file.name]: "error" }))
      }
    }
  }

  const runImgPreview = async () => {
    const ready = stagedImages.filter((i) => imgProgress[i.filename] === "done")
    if (!ready.length) {
      toast.error("Upload at least one image first")
      return
    }
    setLoading(true)
    try {
      const data = await sdk.client.fetch<ValidateResult>("/admin/product-images/validate", {
        method: "POST",
        body: { images: ready },
      })
      setImgPreview(data)
      setImgFilter("all")
      setImgStep("preview")
    } catch (e: any) {
      toast.error(e?.message || "Validation failed")
    } finally {
      setLoading(false)
    }
  }

  const runImgCommit = async () => {
    if (!imgPreview) return
    const toCommit = imgPreview.images
      .filter(
        (r) =>
          r.status === "matched" ||
          (r.status === "already_has_image" && imgOverwrites.has(r.product_id!))
      )
      .map((r) => ({
        product_id: r.product_id!,
        url: r.url,
        overwrite: imgOverwrites.has(r.product_id!),
      }))

    if (!toCommit.length) {
      toast.error("Nothing to commit")
      return
    }
    setLoading(true)
    try {
      const data = await sdk.client.fetch<{ updated: number; errors: string[] }>(
        "/admin/product-images/commit",
        { method: "POST", body: { images: toCommit } }
      )
      setImgCommitResult(data)
      setImgStep("done")
      toast.success(`${data.updated} product${data.updated === 1 ? "" : "s"} updated with images`)
    } catch (e: any) {
      toast.error(e?.message || "Commit failed")
    } finally {
      setLoading(false)
    }
  }

  const resetImages = () => {
    setImgStep("upload")
    setStagedImages([])
    setImgProgress({})
    setImgPreview(null)
    setImgCommitResult(null)
    setImgOverwrites(new Set())
  }

  const toggleOverwrite = (productId: string) => {
    setImgOverwrites((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  // ── Steppers ────────────────────────────────────────────────────────────────

  const CsvStepper = (
    <div className="flex items-center gap-2 mb-6 text-sm">
      {[
        ["source", "1. Source"],
        ["preview", "2. Preview"],
        ["done", "3. Commit"],
      ].map(([key, label], i) => {
        const active = step === key
        const passed =
          (step === "preview" && key === "source") || (step === "done" && key !== "done")
        return (
          <div key={key} className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded ${
                active
                  ? "bg-ui-bg-base border border-ui-border-interactive text-ui-fg-base font-medium"
                  : passed
                    ? "text-ui-tag-green-text"
                    : "text-ui-fg-muted"
              }`}
            >
              {label}
            </span>
            {i < 2 && <span className="text-ui-fg-muted">→</span>}
          </div>
        )
      })}
    </div>
  )

  const ImgStepper = (
    <div className="flex items-center gap-2 mb-6 text-sm">
      {[
        ["upload", "1. Upload"],
        ["preview", "2. Preview matches"],
        ["done", "3. Sync products"],
      ].map(([key, label], i) => {
        const active = imgStep === key
        const passed =
          (imgStep === "preview" && key === "upload") || (imgStep === "done" && key !== "done")
        return (
          <div key={key} className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded ${
                active
                  ? "bg-ui-bg-base border border-ui-border-interactive text-ui-fg-base font-medium"
                  : passed
                    ? "text-ui-tag-green-text"
                    : "text-ui-fg-muted"
              }`}
            >
              {label}
            </span>
            {i < 2 && <span className="text-ui-fg-muted">→</span>}
          </div>
        )
      })}
    </div>
  )

  // ── Filtered rows ────────────────────────────────────────────────────────────

  const filteredCsvRows = preview?.rows.filter((r) => filter === "all" || r.action === filter) || []

  const filteredImgRows =
    imgPreview?.images.filter((r) => imgFilter === "all" || r.status === imgFilter) || []

  const commitableCount =
    imgPreview?.images.filter(
      (r) =>
        r.status === "matched" ||
        (r.status === "already_has_image" && imgOverwrites.has(r.product_id!))
    ).length ?? 0

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Container>
      <Heading level="h1" className="mb-1">
        Stock Import
      </Heading>
      <Text size="small" className="text-ui-fg-subtle mb-4 block">
        Import stock and product data via CSV, or bulk-associate product images.
      </Text>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-ui-border-base mb-6">
        {(["csv", "images"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? "border-ui-fg-base text-ui-fg-base"
                : "border-transparent text-ui-fg-muted hover:text-ui-fg-base"
            }`}
          >
            {tab === "csv" ? "CSV Import" : "Image Upload"}
          </button>
        ))}
      </div>

      {/* ────────────────── CSV TAB ────────────────── */}
      {activeTab === "csv" && (
        <div>
          {CsvStepper}

          {/* STEP 1 — SOURCE */}
          {step === "source" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
                <div>
                  <Text size="small" weight="plus">
                    Start from your current catalogue
                  </Text>
                  <Text size="small" className="text-ui-fg-muted">
                    Export published products as a CSV, edit prices/stock/details, then re-import to
                    update them.
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    isLoading={exporting}
                    onClick={() => exportCatalogue(false)}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="transparent"
                    size="small"
                    disabled={exporting}
                    onClick={() => exportCatalogue(true)}
                  >
                    Load into editor
                  </Button>
                </div>
              </div>

              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) readFile(f)
                }}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-ui-fg-interactive bg-ui-bg-highlight"
                    : "border-ui-border-base hover:border-ui-fg-interactive"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) readFile(f)
                  }}
                />
                <Text className="text-ui-fg-base font-medium">
                  {fileName ? `Loaded: ${fileName}` : "Drop a .csv file here, or click to browse"}
                </Text>
                <Text size="small" className="text-ui-fg-muted mt-1">
                  Max 500KB / 500 rows
                </Text>
              </div>

              <div>
                <Label size="small" weight="plus">
                  …or paste CSV
                </Label>
                <Textarea
                  placeholder={SAMPLE}
                  value={csv}
                  onChange={(e) => {
                    setCsv(e.target.value)
                    setFileName(null)
                  }}
                  rows={8}
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div className="rounded-md bg-ui-bg-subtle p-3 space-y-2">
                <Text size="small" weight="plus">
                  Columns
                </Text>
                <code className="text-xs text-ui-fg-subtle block">{COLUMNS}</code>
                <ul className="text-xs text-ui-fg-muted list-disc pl-5 space-y-1">
                  <li>
                    <code>collab_breweries</code>, <code>hops</code>, <code>images</code> =
                    comma-separated inside a quoted cell.
                  </li>
                  <li>
                    <code>release_at</code> ISO 8601; VIP tier early-access offsets applied
                    automatically.
                  </li>
                  <li>
                    On re-import: empty cell preserves existing value, populated cell replaces it.
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ab"
                    checked={autoBreweries}
                    onCheckedChange={(v) => setAutoBreweries(v === true)}
                  />
                  <Label htmlFor="ab" className="text-sm">
                    Auto-create unknown breweries (active)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ah"
                    checked={autoHops}
                    onCheckedChange={(v) => setAutoHops(v === true)}
                  />
                  <Label htmlFor="ah" className="text-sm">
                    Auto-create unknown hops (as drafts)
                  </Label>
                </div>
              </div>

              <Button onClick={runPreview} isLoading={loading} disabled={!csv.trim()}>
                Preview changes
              </Button>
            </div>
          )}

          {/* STEP 2 — PREVIEW */}
          {step === "preview" && preview && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <Badge color="green">{preview.would_create} to create</Badge>
                <Badge color="blue">{preview.would_update} to update</Badge>
                <Badge color={preview.errors.length ? "red" : "grey"}>
                  {preview.errors.length} error{preview.errors.length === 1 ? "" : "s"}
                </Badge>
                <Text size="small" className="text-ui-fg-muted">
                  {preview.total} rows total
                </Text>
              </div>

              {(preview.would_auto_create_breweries.length > 0 ||
                preview.would_auto_create_hops.length > 0) && (
                <div className="rounded-md bg-ui-bg-subtle p-3 text-xs text-ui-fg-subtle space-y-1">
                  {preview.would_auto_create_breweries.length > 0 && (
                    <div>
                      Will create breweries: {preview.would_auto_create_breweries.join(", ")}
                    </div>
                  )}
                  {preview.would_auto_create_hops.length > 0 && (
                    <div>Will create hops (draft): {preview.would_auto_create_hops.join(", ")}</div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {(["all", "create", "update", "error"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-xs px-2 py-1 rounded capitalize ${
                      filter === f
                        ? "bg-ui-bg-base border border-ui-border-interactive font-medium"
                        : "text-ui-fg-muted hover:text-ui-fg-base"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell className="w-12">#</Table.HeaderCell>
                    <Table.HeaderCell>Name</Table.HeaderCell>
                    <Table.HeaderCell>Action</Table.HeaderCell>
                    <Table.HeaderCell>Changes</Table.HeaderCell>
                    <Table.HeaderCell>Notes</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredCsvRows.map((r) => {
                    const b = ACTION_BADGE[r.action]
                    return (
                      <Table.Row key={r.row}>
                        <Table.Cell className="text-ui-fg-muted">{r.row}</Table.Cell>
                        <Table.Cell className="font-medium">{r.name}</Table.Cell>
                        <Table.Cell>
                          <Badge size="2xsmall" color={b.color}>
                            {b.label}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell className="text-xs text-ui-fg-subtle">
                          {r.changes
                            ? `${r.changes.brewery} · ${r.changes.style} · ${r.changes.abv}% · $${r.changes.price}${r.changes.compare_at_price ? ` (was $${r.changes.compare_at_price})` : ""}`
                            : "—"}
                        </Table.Cell>
                        <Table.Cell className="text-xs text-ui-fg-muted">
                          {r.messages.length ? r.messages.join("; ") : "—"}
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                  {filteredCsvRows.length === 0 && (
                    <Table.Row>
                      <Table.Cell colSpan={5}>
                        <div className="text-center text-ui-fg-muted py-6">
                          No rows in this filter.
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table>

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setStep("source")} disabled={loading}>
                  Back
                </Button>
                <Button
                  onClick={runCommit}
                  isLoading={loading}
                  disabled={preview.would_create + preview.would_update === 0}
                >
                  Commit import ({preview.would_create + preview.would_update})
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 — DONE */}
          {step === "done" && commit && (
            <div className="space-y-4">
              <div className="rounded-lg border border-ui-border-base p-6 text-center">
                <Heading level="h2" className="text-ui-tag-green-text">
                  Import complete
                </Heading>
                <div className="flex justify-center gap-6 mt-3">
                  <div>
                    <Text className="text-2xl font-semibold">{commit.created}</Text>
                    <Text size="small" className="text-ui-fg-muted">
                      created
                    </Text>
                  </div>
                  <div>
                    <Text className="text-2xl font-semibold">{commit.updated}</Text>
                    <Text size="small" className="text-ui-fg-muted">
                      updated
                    </Text>
                  </div>
                  <div>
                    <Text className="text-2xl font-semibold text-ui-fg-error">
                      {commit.errors.length}
                    </Text>
                    <Text size="small" className="text-ui-fg-muted">
                      errors
                    </Text>
                  </div>
                </div>
              </div>

              {(commit.auto_created_breweries.length > 0 ||
                commit.auto_created_hops.length > 0) && (
                <div className="rounded-md bg-ui-bg-subtle p-3 text-xs text-ui-fg-subtle space-y-1">
                  {commit.auto_created_breweries.length > 0 && (
                    <div>Created breweries: {commit.auto_created_breweries.join(", ")}</div>
                  )}
                  {commit.auto_created_hops.length > 0 && (
                    <div>Created hops (draft): {commit.auto_created_hops.join(", ")}</div>
                  )}
                </div>
              )}

              {commit.errors.length > 0 && (
                <div>
                  <Text size="small" weight="plus" className="text-ui-fg-error">
                    Errors
                  </Text>
                  <ul className="text-xs text-ui-fg-subtle mt-1 space-y-1 list-disc pl-5">
                    {commit.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={resetCsv}>Import another file</Button>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── IMAGE UPLOAD TAB ────────────────── */}
      {activeTab === "images" && (
        <div>
          {ImgStepper}

          {/* IMAGE STEP 1 — UPLOAD */}
          {imgStep === "upload" && (
            <div className="space-y-4">
              <div className="rounded-md bg-ui-bg-subtle p-3 text-xs text-ui-fg-muted">
                <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1 block">
                  Naming convention
                </Text>
                Rename each image file to match its product handle before uploading. For example:{" "}
                <code className="text-ui-fg-base">tree-house-julius.jpg</code>,{" "}
                <code className="text-ui-fg-base">fidens-excelsior.jpg</code>.<br />
                The handle is the URL slug shown in the product detail page.
              </div>

              {/* Drop zone */}
              <div
                onClick={() => imgInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setImgDragOver(true)
                }}
                onDragLeave={() => setImgDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setImgDragOver(false)
                  handleImageFiles(e.dataTransfer.files)
                }}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  imgDragOver
                    ? "border-ui-fg-interactive bg-ui-bg-highlight"
                    : "border-ui-border-base hover:border-ui-fg-interactive"
                }`}
              >
                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleImageFiles(e.target.files)
                  }}
                />
                <Text className="text-ui-fg-base font-medium">
                  Drop image files here, or click to browse
                </Text>
                <Text size="small" className="text-ui-fg-muted mt-1">
                  JPEG · PNG · WebP — named as product-handle.jpg
                </Text>
              </div>

              {/* File list */}
              {Object.keys(imgProgress).length > 0 && (
                <div className="rounded-lg border border-ui-border-base overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-ui-bg-subtle border-b border-ui-border-base">
                    <Text size="small" weight="plus">
                      Files ({Object.keys(imgProgress).length})
                    </Text>
                    <Text size="small" className="text-ui-fg-muted">
                      {Object.values(imgProgress).filter((s) => s === "done").length} uploaded
                    </Text>
                  </div>
                  <ul className="divide-y divide-ui-border-base">
                    {Object.entries(imgProgress).map(([filename, status]) => (
                      <li key={filename} className="flex items-center justify-between px-4 py-2">
                        <span className="text-sm font-mono text-ui-fg-base truncate max-w-xs">
                          {filename}
                        </span>
                        <FileStatusBadge status={status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => imgInputRef.current?.click()}
                >
                  Upload more files
                </Button>
                <Button
                  onClick={runImgPreview}
                  isLoading={loading}
                  disabled={!stagedImages.some((i) => imgProgress[i.filename] === "done")}
                >
                  Preview matches
                </Button>
              </div>
            </div>
          )}

          {/* IMAGE STEP 2 — PREVIEW */}
          {imgStep === "preview" && imgPreview && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge color="green">{imgPreview.matched} matched</Badge>
                <Badge color="grey">{imgPreview.no_match} no match</Badge>
                <Badge color="orange">{imgPreview.already_has_image} has image</Badge>
                <Text size="small" className="text-ui-fg-muted">
                  {imgPreview.images.length} file{imgPreview.images.length === 1 ? "" : "s"} total
                </Text>
              </div>

              {imgPreview.already_has_image > 0 && (
                <div className="rounded-md bg-ui-bg-subtle p-3 text-xs text-ui-fg-muted">
                  Products marked <strong>Has image</strong> already have a thumbnail. Check the
                  Overwrite box on those rows to replace the existing image.
                </div>
              )}

              {/* Filter tabs */}
              <div className="flex gap-2">
                {(["all", "matched", "already_has_image", "no_match"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setImgFilter(f)}
                    className={`text-xs px-2 py-1 rounded ${
                      imgFilter === f
                        ? "bg-ui-bg-base border border-ui-border-interactive font-medium"
                        : "text-ui-fg-muted hover:text-ui-fg-base"
                    }`}
                  >
                    {f === "all"
                      ? "All"
                      : f === "matched"
                        ? "Matched"
                        : f === "already_has_image"
                          ? "Has image"
                          : "No match"}
                  </button>
                ))}
              </div>

              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Filename</Table.HeaderCell>
                    <Table.HeaderCell>Handle</Table.HeaderCell>
                    <Table.HeaderCell>Product</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell className="w-28">Overwrite?</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredImgRows.map((r) => {
                    const b = IMG_STATUS_BADGE[r.status]
                    return (
                      <Table.Row key={r.filename}>
                        <Table.Cell className="font-mono text-xs">{r.filename}</Table.Cell>
                        <Table.Cell className="font-mono text-xs text-ui-fg-muted">
                          {r.handle}
                        </Table.Cell>
                        <Table.Cell className="text-sm">{r.product_title ?? "—"}</Table.Cell>
                        <Table.Cell>
                          <Badge size="2xsmall" color={b.color}>
                            {b.label}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          {r.status === "already_has_image" ? (
                            <div className="flex items-center gap-2">
                              {r.existing_thumbnail && (
                                <img
                                  src={r.existing_thumbnail}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover border border-ui-border-base"
                                />
                              )}
                              <Checkbox
                                id={`ow-${r.product_id}`}
                                checked={imgOverwrites.has(r.product_id!)}
                                onCheckedChange={() => toggleOverwrite(r.product_id!)}
                              />
                            </div>
                          ) : (
                            <span className="text-ui-fg-muted">—</span>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                  {filteredImgRows.length === 0 && (
                    <Table.Row>
                      <Table.Cell colSpan={5}>
                        <div className="text-center text-ui-fg-muted py-6">
                          No rows in this filter.
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table>

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setImgStep("upload")} disabled={loading}>
                  Back
                </Button>
                <Button onClick={runImgCommit} isLoading={loading} disabled={commitableCount === 0}>
                  Commit images ({commitableCount})
                </Button>
              </div>
            </div>
          )}

          {/* IMAGE STEP 3 — DONE */}
          {imgStep === "done" && imgCommitResult && (
            <div className="space-y-4">
              <div className="rounded-lg border border-ui-border-base p-6 text-center">
                <Heading level="h2" className="text-ui-tag-green-text">
                  Images synced
                </Heading>
                <div className="flex justify-center gap-6 mt-3">
                  <div>
                    <Text className="text-2xl font-semibold">{imgCommitResult.updated}</Text>
                    <Text size="small" className="text-ui-fg-muted">
                      updated
                    </Text>
                  </div>
                  <div>
                    <Text className="text-2xl font-semibold text-ui-fg-error">
                      {imgCommitResult.errors.length}
                    </Text>
                    <Text size="small" className="text-ui-fg-muted">
                      errors
                    </Text>
                  </div>
                </div>
              </div>

              {imgCommitResult.errors.length > 0 && (
                <div>
                  <Text size="small" weight="plus" className="text-ui-fg-error">
                    Errors
                  </Text>
                  <ul className="text-xs text-ui-fg-subtle mt-1 space-y-1 list-disc pl-5">
                    {imgCommitResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={resetImages}>Upload more images</Button>
            </div>
          )}
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Stock Import",
})

export default StockImportPage
