# Migrations

Schema changes flow through Medusa's MikroORM-based migration system.
One migration per module, generated with the CLI.

## Generate

```bash
just migration my-module-name
# or
pnpm --filter ./apps/backend exec medusa db:generate my-module-name
```

This snapshots the current state of `apps/backend/src/modules/<name>/models/`
and emits a timestamped SQL migration into the module's `migrations/`
folder.

## Run (local)

```bash
just migrate
# or
pnpm --filter ./apps/backend exec medusa db:migrate
```

## Run (production)

`deploy-prod.yml` runs migrations as part of every deploy unless
`skip_migrations: true` is passed. `deploy-staging.yml` runs them
non-fatally so a stuck migration doesn't block staging.

## Reset (DANGEROUS — local only)

```bash
just reset-db
```

Drops the database, recreates it, runs migrations, creates an admin
user, and runs the seed. Volumes are removed via `docker compose
down -v`.

## Patterns

### Adding a column

Edit the model. Run `just migration <module>`. The generated migration
contains the `ADD COLUMN` statement; review it before committing.

### Renaming a column

The migration generator emits a `DROP` + `ADD`, which loses data. Edit
the migration to use `ALTER TABLE … RENAME COLUMN` instead, **then**
deploy.

### Renaming a module

If you rename a module ID, write a migration that issues
`ALTER TABLE old_table RENAME TO new_table` for every table the module
owns. Run it on staging first.

### Backfilling data

Combine the schema migration with a one-off script in
`apps/backend/src/scripts/`. Deploy the schema migration first, run
the backfill script second (`pnpm exec medusa exec ./src/scripts/backfill.ts`),
then deploy the code that depends on the new shape.

## Rollback

There is no automatic rollback. The conventional Medusa pattern is
forward-only: write a new migration that reverts the change. For
production emergencies, restore from the latest Postgres backup.
