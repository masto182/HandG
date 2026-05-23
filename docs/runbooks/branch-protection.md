# Branch protection & environment configuration

This repo's CI/CD assumes a specific GitHub setup. The locked defaults
below match the ones the example repo ships with — adopters should
replicate (or relax) per their own org policy.

## Branch protection on `main`

- Require a pull request before merging
- Require **1 approval**
  - Self-approval is **allowed** (small-team convention; tighten for
    larger teams)
- Require status checks to pass before merging:
  - `Install dependencies`, `Typecheck`, `Lint`, `Build (turbo)`
  - `Backend unit tests`, `Storefront component tests`
  - `Backend integration tests (Node 20)`
  - `Secret scan (gitleaks)`, `CodeQL (javascript-typescript)`
  - `Dependency audit (pnpm)`
  - `Trivy filesystem scan`, `Trivy IaC scan (Dockerfiles + compose)`
- The `Storybook` and `Build images` workflows are intentionally NOT in
  this list — Storybook has a known Storybook 8.6 + Next 15.5 build
  quirk pending Storybook 9 stable, and `Build images` runs post-merge
  to publish to GHCR.
- Require branches to be up to date before merging
- Require linear history
- Require signed commits (recommended; not strictly required)
- Restrict who can push to matching branches: empty (PR-only)

## GitHub Environments

Two environments are wired: `staging` and `production`.

### staging

- Deployment branch: `main` only
- Required reviewers: none (auto-deploys after `Build images` succeeds)
- Secrets:
  - `ORACLE_HOST`, `ORACLE_USER`, `ORACLE_SSH_KEY`
  - `GHCR_PULL_TOKEN` (read-only PAT scoped to `read:packages`)
- Variables:
  - `STAGING_DOMAIN` (e.g. `staging.example.com`)

### production

- Deployment branch: `main` only
- Required reviewers: **1 approval** (self-approve allowed)
- Wait timer: 0 (rely on staging soak time instead)
- Secrets:
  - `ORACLE_HOST`, `ORACLE_USER`, `ORACLE_SSH_KEY`
  - `GHCR_PULL_TOKEN`
- Variables:
  - `PRODUCTION_DOMAIN` (e.g. `example.com`)

## Repository-level secrets

None required by default — all deploy secrets live on the environments
above so a compromised PR cannot exfiltrate prod credentials.

## Workflow safety summary

| Workflow                | Permissions                                 | Trigger                        | Timeout |
| ----------------------- | ------------------------------------------- | ------------------------------ | ------- |
| `ci.yml`                | `contents: read`                            | push, PR                       | 15-25m  |
| `security.yml`          | `contents: read, security-events: write`   | push, PR, weekly Mon 4am UTC   | 20m     |
| `build-images.yml`      | `contents: read, packages: write, security-events: write` | push to main, manual           | 30m     |
| `deploy-staging.yml`    | `contents: read`                            | after build, manual            | 20m     |
| `deploy-prod.yml`       | `contents: read, packages: write`           | manual only (with input tag)   | 30m     |
| `rollback-prod.yml`     | `contents: read, packages: write`           | manual only                    | 25m     |

All workflows use `concurrency` groups; CI/staging cancel in-progress
runs, deploy/promote workflows do **not** cancel (a half-aborted deploy
is worse than a queued one).
