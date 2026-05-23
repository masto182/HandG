import { MedusaService } from "@medusajs/framework/utils"
import SiteConfig from "./models/site-config"
import SiteConfigHistory from "./models/site-config-history"
import {
  SITE_CONFIG_REGISTRY,
  SiteConfigDefinition,
  PUBLIC_SITE_CONFIG_KEYS,
  coerceEnvValue,
} from "./registry"

export type ConfigSource = "override" | "env" | "default"

export type ConfigEntry = {
  key: string
  group: string
  label: string
  description: string
  type: string
  isPublic: boolean
  envVar: string | null
  default: unknown
  override: unknown | null
  effective: unknown
  source: ConfigSource
  updatedAt: Date | null
  updatedBy: string | null
}

class SiteConfigModuleService extends MedusaService({
  SiteConfig,
  SiteConfigHistory,
}) {
  /**
   * Get the effective value for a key. Resolution order:
   *   1. site_config row (override)
   *   2. process.env[envVar] (if registry has envVar and validator passes)
   *   3. registry default
   * Never throws; logs and falls back on errors.
   */
  async get<T = unknown>(key: string): Promise<T> {
    const entry = await this.getEffectiveWithSource(key)
    return entry.effective as T
  }

  async getMany<T extends Record<string, unknown>>(keys: string[]): Promise<T> {
    const out: Record<string, unknown> = {}
    for (const k of keys) {
      out[k] = await this.get(k)
    }
    return out as T
  }

  async getAll(): Promise<ConfigEntry[]> {
    const keys = Object.keys(SITE_CONFIG_REGISTRY)
    const out: ConfigEntry[] = []
    for (const k of keys) {
      out.push(await this.getEffectiveWithSource(k))
    }
    return out
  }

  async getPublic(): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = {}
    for (const k of PUBLIC_SITE_CONFIG_KEYS) {
      out[k] = await this.get(k)
    }
    return out
  }

  /**
   * Returns the effective value alongside its source, suitable for the admin API.
   */
  async getEffectiveWithSource(key: string): Promise<ConfigEntry> {
    const def = this.getDefinition(key)

    let row: any = null
    try {
      const rows = await (this as any).listSiteConfigs({ key })
      row = rows?.[0] ?? null
    } catch (e) {
      // Listing can fail before migrations run; treat as no override.
      row = null
    }

    let effective: unknown = def.default
    let source: ConfigSource = "default"

    if (row) {
      effective = row.value
      source = "override"
    } else if (def.envVar) {
      const raw = process.env[def.envVar]
      if (raw !== undefined && raw !== "") {
        const coerced = coerceEnvValue(def.type, raw)
        const err = def.validate ? def.validate(coerced) : null
        if (!err) {
          effective = coerced
          source = "env"
        } else {
          // env value invalid; log and fall through to default
          console.warn(
            `[site-config] env var ${def.envVar} for ${key} failed validation: ${err}; using default`
          )
        }
      }
    }

    return {
      key: def.key,
      group: def.group,
      label: def.label,
      description: def.description,
      type: def.type,
      isPublic: def.isPublic,
      envVar: def.envVar ?? null,
      default: def.default,
      override: row ? row.value : null,
      effective,
      source,
      updatedAt: row?.updated_at ?? null,
      updatedBy: row?.updated_by ?? null,
    }
  }

  /**
   * Set or replace an override. Validates against registry, appends history row.
   */
  async set(key: string, value: unknown, actor?: string): Promise<ConfigEntry> {
    const def = this.getDefinition(key)
    const err = def.validate ? def.validate(value) : null
    if (err) {
      const e: any = new Error(`Invalid value for ${key}: ${err}`)
      e.status = 400
      e.code = "INVALID_SITE_CONFIG_VALUE"
      throw e
    }

    const existing = await this.getOverrideRow(key)
    const valueOld = existing ? existing.value : null

    if (existing) {
      await (this as any).updateSiteConfigs({
        selector: { id: existing.id },
        data: { value, updated_by: actor ?? null },
      })
    } else {
      await (this as any).createSiteConfigs({
        key,
        value,
        updated_by: actor ?? null,
      })
    }

    await (this as any).createSiteConfigHistories({
      key,
      value_old: valueOld,
      value_new: value,
      action: "set",
      actor: actor ?? null,
    })

    return this.getEffectiveWithSource(key)
  }

  /**
   * Remove the override row (revert to env or default). Appends history row.
   */
  async unset(key: string, actor?: string): Promise<ConfigEntry> {
    this.getDefinition(key) // validate key exists

    const existing = await this.getOverrideRow(key)
    if (existing) {
      await (this as any).deleteSiteConfigs([existing.id])
      await (this as any).createSiteConfigHistories({
        key,
        value_old: existing.value,
        value_new: null,
        action: "unset",
        actor: actor ?? null,
      })
    }

    return this.getEffectiveWithSource(key)
  }

  async getHistory(key: string, limit = 20): Promise<any[]> {
    this.getDefinition(key)
    const rows = await (this as any).listSiteConfigHistories(
      { key },
      { take: limit, order: { created_at: "DESC" } }
    )
    return rows
  }

  // ---------- internals ----------

  private getDefinition(key: string): SiteConfigDefinition {
    const def = SITE_CONFIG_REGISTRY[key]
    if (!def) {
      const e: any = new Error(`Unknown site config key: ${key}`)
      e.status = 404
      e.code = "UNKNOWN_SITE_CONFIG_KEY"
      throw e
    }
    return def
  }

  private async getOverrideRow(key: string): Promise<any | null> {
    try {
      const rows = await (this as any).listSiteConfigs({ key })
      return rows?.[0] ?? null
    } catch {
      return null
    }
  }
}

export default SiteConfigModuleService
