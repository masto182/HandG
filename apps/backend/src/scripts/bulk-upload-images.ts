/**
 * Bulk image uploader for Hops & Glory products.
 *
 * Scans two sources (priority order):
 *   1. data/product-images/{handle}.{jpg,jpeg,png,webp}  — uploaded to MinIO
 *   2. data/product-image-urls.json                      — external CDN URLs attached
 *      directly (type != local_file) or uploaded from disk (type = local_file)
 *
 * Local files in product-images/ take precedence over same-handle entries in the JSON.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/bulk-upload-images.ts              # dry-run (default)
 *   DRY_RUN=false npx medusa exec ./src/scripts/bulk-upload-images.ts # commit
 *   FORCE_OVERWRITE=true DRY_RUN=false npx medusa exec ./src/scripts/bulk-upload-images.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

const IMAGE_DIR = path.join(process.cwd(), "data", "product-images")
const URL_MAP_FILE = path.join(process.cwd(), "data", "product-image-urls.json")
const SUPPORTED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"])

type QueueEntry = { source: "local"; filePath: string } | { source: "url"; url: string }

function mimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".png") return "image/png"
  if (ext === ".webp") return "image/webp"
  return "image/jpeg"
}

export default async function bulkUploadImages({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as any
  const fileModule = container.resolve(Modules.FILE) as any
  const productModule = container.resolve(Modules.PRODUCT) as any

  const dryRun = process.env.DRY_RUN !== "false"
  const forceOverwrite = process.env.FORCE_OVERWRITE === "true"

  console.log(`\n${dryRun ? "[DRY RUN] " : ""}Bulk product image upload`)
  console.log(`Force overwrite: ${forceOverwrite}`)

  // ── 1. Load all published products into a handle → product map ─────────────

  const allProducts = await productModule.listProducts(
    { status: "published" },
    { take: 1000, relations: ["images"] }
  )
  const productByHandle = new Map<string, any>(allProducts.map((p: any) => [p.handle, p]))
  console.log(`\nFound ${productByHandle.size} published products`)

  // ── 2. Build the work queue from both sources ──────────────────────────────

  const queue = new Map<string, QueueEntry>()

  // 2a. product-image-urls.json
  if (fs.existsSync(URL_MAP_FILE)) {
    let urlMap: any
    try {
      urlMap = JSON.parse(fs.readFileSync(URL_MAP_FILE, "utf-8"))
    } catch (e: any) {
      logger.warn(`[BulkUpload] Failed to parse ${URL_MAP_FILE}: ${e.message}`)
      urlMap = {}
    }
    const images = urlMap.images || {}
    for (const [handle, entry] of Object.entries(images)) {
      const e = entry as any
      if (e.type === "local_file") {
        // Resolve relative path stored in the JSON (e.g. "data/product-images/xxx.jpg")
        const resolved = path.resolve(process.cwd(), e.url)
        if (fs.existsSync(resolved)) {
          queue.set(handle, { source: "local", filePath: resolved })
        } else {
          logger.warn(`[BulkUpload] JSON local_file not found on disk: ${resolved}`)
        }
      } else if (typeof e.url === "string" && e.url.startsWith("http")) {
        queue.set(handle, { source: "url", url: e.url })
      }
    }
    console.log(`  ${Object.keys(images).length} entries from product-image-urls.json`)
  } else {
    console.log(`  product-image-urls.json not found — skipping JSON source`)
  }

  // 2b. product-images/ directory — overrides JSON for same handle
  if (fs.existsSync(IMAGE_DIR)) {
    let localCount = 0
    for (const file of fs.readdirSync(IMAGE_DIR)) {
      const ext = path.extname(file).toLowerCase()
      if (!SUPPORTED_EXTS.has(ext)) continue
      const handle = path.basename(file, ext)
      queue.set(handle, { source: "local", filePath: path.join(IMAGE_DIR, file) })
      localCount++
    }
    console.log(`  ${localCount} files from data/product-images/ (override JSON where same handle)`)
  } else {
    console.log(`  data/product-images/ not found — skipping local files`)
  }

  console.log(`  ${queue.size} unique handles in queue\n`)

  // ── 3. Process each entry ──────────────────────────────────────────────────

  let uploadedCount = 0
  let attachedCount = 0
  let skippedCount = 0
  let noMatchCount = 0
  const errors: Array<{ handle: string; error: string }> = []

  type ReportRow = {
    handle: string
    status: "uploaded" | "attached_external" | "skipped_has_image" | "no_product" | "error"
    url?: string
    note?: string
  }
  const report: ReportRow[] = []

  for (const [handle, item] of queue) {
    const product = productByHandle.get(handle)

    if (!product) {
      noMatchCount++
      report.push({ handle, status: "no_product" })
      continue
    }

    // Skip if already has an image and overwrite not forced
    if (!forceOverwrite && (product.thumbnail || product.images?.length > 0)) {
      skippedCount++
      report.push({
        handle,
        status: "skipped_has_image",
        url: product.thumbnail || product.images?.[0]?.url,
      })
      continue
    }

    try {
      let imageUrl: string

      if (item.source === "local") {
        const filePath = item.filePath
        const filename = `products/${handle}${path.extname(filePath)}`
        const mime = mimeType(filePath)

        if (!dryRun) {
          const buffer = fs.readFileSync(filePath)
          const [uploaded] = await fileModule.createFiles([
            {
              filename,
              mimeType: mime,
              content: buffer,
            },
          ])
          imageUrl = uploaded.url
        } else {
          imageUrl = `[would upload → ${filename}]`
        }

        uploadedCount++
        report.push({ handle, status: "uploaded", url: imageUrl, note: path.basename(filePath) })
      } else {
        // External URL — attach directly, no upload needed
        imageUrl = item.url

        attachedCount++
        report.push({ handle, status: "attached_external", url: imageUrl })
      }

      if (!dryRun) {
        await productModule.updateProducts(product.id, {
          images: [{ url: imageUrl }],
          thumbnail: imageUrl,
        })
      }
    } catch (err: any) {
      errors.push({ handle, error: err.message })
      report.push({ handle, status: "error", note: err.message })
    }
  }

  // ── 4. Print report ────────────────────────────────────────────────────────

  const statusIcon: Record<ReportRow["status"], string> = {
    uploaded: "↑",
    attached_external: "→",
    skipped_has_image: "✓",
    no_product: "✗",
    error: "!",
  }

  console.log("── Detail ───────────────────────────────────────────────────────")
  for (const row of report) {
    const icon = statusIcon[row.status]
    const extra = row.url
      ? ` ${row.url.length > 80 ? row.url.slice(0, 80) + "…" : row.url}`
      : row.note
        ? ` (${row.note})`
        : ""
    console.log(`  ${icon} ${row.handle}${extra}`)
  }

  console.log("\n── Summary ─────────────────────────────────────────────────────")
  console.log(`  ${uploadedCount} local files uploaded to MinIO`)
  console.log(`  ${attachedCount} external URLs attached directly`)
  console.log(`  ${skippedCount} already had images (use FORCE_OVERWRITE=true to replace)`)
  console.log(`  ${noMatchCount} handles had no matching product in the DB`)
  console.log(`  ${errors.length} errors`)

  if (errors.length > 0) {
    console.log("\nErrors:")
    for (const e of errors) console.log(`  ! ${e.handle}: ${e.error}`)
  }

  if (dryRun) {
    console.log("\nThis was a dry run — no files were uploaded and no products were changed.")
    console.log("Run with DRY_RUN=false to commit.\n")
  } else {
    console.log(`\nDone. ${uploadedCount + attachedCount} products updated.\n`)
  }
}
