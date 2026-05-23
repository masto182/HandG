# Security policy

## Reporting a vulnerability

If you discover a security issue, **please do not open a public GitHub
issue.** Instead, use GitHub's private vulnerability reporting:

1. Go to the **Security** tab of this repository.
2. Click **Report a vulnerability**.
3. Fill out the form. We aim to acknowledge within 5 business days.

## Supported versions

This is a reference implementation for migrating retail e-commerce
workloads. The `main` branch is the only supported version. We do not
backport security patches to historical commits.

## Scope

In scope:

- Code in `apps/backend`, `apps/storefront`, `packages/`
- CI/CD workflows in `.github/workflows/`
- Container images published to `ghcr.io/sfc-gh-cmasterson/{backend,storefront}`

Out of scope:

- Third-party services (Postgres, Redis, MeiliSearch, MinIO, Resend, etc.)
  — report directly to the upstream vendor.
- Issues that require physical access or authenticated admin access.

## Automated scanning

The repository runs the following on every push/PR and on a weekly
schedule:

- **gitleaks** — secret scanning (also runs as a pre-commit hook).
- **CodeQL** — static analysis (security-and-quality query suite).
- **pnpm audit** — production dependency vulnerabilities (high+critical
  fail the build).
- **Trivy** — filesystem scan (high+critical fail), Docker config scan
  (informational), and image scan after every build.

Findings are uploaded as SARIF and visible under the **Security → Code
scanning** tab.
