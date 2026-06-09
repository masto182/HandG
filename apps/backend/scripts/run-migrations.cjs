// Direct-SQL Medusa migration runner.
//
// WHY THIS EXISTS: `medusa db:migrate` hangs indefinitely on this OCI host.
// After "Migrations table created successfully" the MedusaApp_ bootstrap
// (loadModules for ~30 modules) stalls on an unresolved promise while churning
// hundreds of short-lived postgres connections, and never runs a single module
// migration. Root cause is environment-specific (restricted egress + bootstrap
// behaviour) and not fixable via config. This runner bypasses the module
// bootstrap entirely: it loads each module's MikroORM migration class, captures
// the SQL its up() emits, and applies it directly. Tracked in mikro_orm_migrations
// so it stays compatible with Medusa's own migrator if it ever works here.
//
// Idempotent: already-applied migrations (recorded in mikro_orm_migrations) are
// skipped, so re-running is safe. On a clean DB it applies everything in order.
const { Client } = require("pg")
const path = require("path")
const fs = require("fs")

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL required")
  process.exit(1)
}

const APP_ROOT = process.env.MIGRATION_APP_ROOT || "/app"
const PNPM_DIR = path.join(APP_ROOT, "node_modules/.pnpm")
const CUSTOM_SRC = path.join(APP_ROOT, "apps/backend/.medusa/server/src")

function getMigrationDirs() {
  const dirs = []
  const seen = new Set()
  const addDir = (d) => {
    if (!seen.has(d) && fs.existsSync(d)) {
      seen.add(d)
      dirs.push(d)
    }
  }

  // Core @medusajs module migrations live in the pnpm virtual store:
  //   @medusajs+pkg@ver/node_modules/@medusajs/pkg/dist/migrations
  try {
    for (const pkg of fs.readdirSync(PNPM_DIR)) {
      if (!pkg.startsWith("@medusajs+")) continue
      const nmDir = path.join(PNPM_DIR, pkg, "node_modules")
      if (!fs.existsSync(nmDir)) continue
      for (const ns of fs.readdirSync(nmDir)) {
        const nsDir = path.join(nmDir, ns)
        let stat
        try {
          stat = fs.statSync(nsDir)
        } catch (e) {
          continue
        }
        if (!stat.isDirectory()) continue
        if (ns.startsWith("@")) {
          for (const sub of fs.readdirSync(nsDir)) {
            addDir(path.join(nsDir, sub, "dist", "migrations"))
          }
        } else {
          addDir(path.join(nsDir, "dist", "migrations"))
        }
      }
    }
  } catch (e) {
    console.error("pnpm walk error:", e.message)
  }

  // Custom module migrations in the compiled app output.
  const walkCustom = (dir) => {
    let items
    try {
      items = fs.readdirSync(dir)
    } catch (e) {
      return
    }
    for (const item of items) {
      const full = path.join(dir, item)
      let stat
      try {
        stat = fs.statSync(full)
      } catch (e) {
        continue
      }
      if (!stat.isDirectory()) continue
      if (item === "migrations") addDir(full)
      else walkCustom(full)
    }
  }
  walkCustom(CUSTOM_SRC)

  return dirs
}

// Build a migration instance that mimics MikroORM's two-channel SQL model:
//   - this.execute(sql)  runs IMMEDIATELY and returns rows. Migrations use it
//     for introspection (e.g. "does the store table exist?") and branch on the
//     result, so it MUST hit the live DB and return rows.
//   - this.addSql(sql)   queues DDL to run after up() resolves.
// Both run inside the per-migration transaction (client), so execute() sees the
// committed schema from previous migrations plus anything queued earlier here.
function makeCapturingMigration(MigClass, client, queue) {
  // Use the real constructor: the MikroORM Migration base initializes internal
  // state that up() relies on. Object.create() skips it.
  const m = new MigClass(undefined, undefined)
  const coerce = (sql) => {
    if (typeof sql === "string") return sql
    if (sql && typeof sql.toQuery === "function") return sql.toQuery()
    if (sql && typeof sql.toString === "function") return sql.toString()
    throw new Error("received a non-string SQL this runner cannot serialize")
  }
  m.addSql = (sql) => {
    queue.push(coerce(sql))
  }
  m.execute = async (sql) => {
    const res = await client.query(coerce(sql))
    return res.rows
  }
  m.getKnex = () => {
    throw new Error("getKnex() is not supported by the direct-SQL runner")
  }
  return m
}

// Only true idempotency errors are tolerated (safe re-run on a partially
// migrated DB). Everything else — including "does not exist" — is fatal, because
// a "does not exist" usually means an earlier statement was wrongly skipped.
function isIdempotentError(msg) {
  return /already exists|duplicate/i.test(msg)
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log("Connected to DB")

  await client.query(`CREATE TABLE IF NOT EXISTS mikro_orm_migrations (
    id serial PRIMARY KEY,
    name varchar(255),
    executed_at timestamptz DEFAULT NOW()
  )`)

  const { rows } = await client.query("SELECT name FROM mikro_orm_migrations")
  const done = new Set(rows.map((r) => r.name))
  console.log("Already applied:", done.size)

  const dirs = getMigrationDirs()
  console.log("Migration dirs discovered:", dirs.length)

  let ran = 0
  const failures = []

  for (const dir of dirs) {
    let files
    try {
      files = fs
        .readdirSync(dir)
        .filter(
          (f) =>
            f.endsWith(".js") &&
            !f.endsWith(".d.js") &&
            !f.includes("index") &&
            !f.includes("spec") &&
            !f.includes("test")
        )
        .sort()
    } catch (e) {
      continue
    }

    for (const file of files) {
      const name = file.replace(/\.js$/, "")
      if (done.has(name)) continue

      const fullPath = path.join(dir, file)
      let MigClass
      try {
        delete require.cache[require.resolve(fullPath)]
        const mod = require(fullPath)
        MigClass = Object.values(mod).find(
          (v) => typeof v === "function" && v.prototype && typeof v.prototype.up === "function"
        )
      } catch (e) {
        failures.push({ name, stage: "require", error: e.message.split("\n")[0] })
        continue
      }
      if (!MigClass) continue

      // Each migration is atomic: begin, run up() (its execute() reads/writes
      // happen live in this txn), then apply queued addSql, record, commit.
      try {
        await client.query("BEGIN")
        const queue = []
        const m = makeCapturingMigration(MigClass, client, queue)
        await m.up()
        for (const sql of queue) {
          try {
            await client.query(sql)
          } catch (e) {
            if (isIdempotentError(e.message)) continue
            throw e
          }
        }
        await client.query("INSERT INTO mikro_orm_migrations(name) VALUES($1)", [name])
        await client.query("COMMIT")
        process.stdout.write("  OK  " + name + "\n")
        ran++
        done.add(name)
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {})
        failures.push({ name, stage: "up/apply", error: e.message.split("\n")[0] })
      }
    }
  }

  const total = await client.query("SELECT count(*) FROM mikro_orm_migrations")
  const tables = await client.query("SELECT count(*) FROM pg_tables WHERE schemaname='public'")
  console.log(
    `\nDone. Applied this run: ${ran}, Total recorded: ${total.rows[0].count}, Public tables: ${tables.rows[0].count}`
  )

  if (failures.length) {
    console.error(`\n${failures.length} migration(s) FAILED:`)
    for (const f of failures) {
      console.error(`  [${f.stage}] ${f.name}: ${f.error}`)
    }
    await client.end()
    process.exit(1)
  }

  await client.end()
  process.exit(0)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
