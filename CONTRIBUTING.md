# Contributing

Thanks for considering a contribution. This is a reference repo — small
quality-of-life improvements and bug fixes are very welcome; large
feature additions are usually out of scope unless they remove a
demo-specific module or generalise a hard-coded assumption.

## Quick checklist

- [ ] Run `just ci` locally (lint, typecheck, build, test) — all green
- [ ] Conventional commit subject (`feat:`, `fix:`, `docs:`, …)
- [ ] If you added env vars: updated `apps/{backend,storefront}/.env.example`
      and `docs/configuration.md`
- [ ] If you changed schema: migration generated and committed
- [ ] No secrets in any commit (gitleaks runs as a pre-commit hook)
- [ ] Filled in the PR template

## Workflow

1. Fork → branch off `main` (`feat/<short-name>` is the convention)
2. Run `just bootstrap` once to set up your local stack
3. Make changes; run `just ci` before pushing
4. Open a PR. CI runs lint / typecheck / unit / component / integration
   / security / Lighthouse. All required.
5. Address review (1 approval is the configured minimum). Self-approval
   is permitted for trivial PRs by maintainers.
6. Merge. release-please will open a release PR if your commits
   warrant a version bump.

## Conventional commits

[`commitlint`](../commitlint.config.cjs) enforces the spec on
`commit-msg`. Allowed types:

- `feat` — a new user-visible feature
- `fix` — a bug fix
- `perf` — performance work
- `refactor` — internal change, no behaviour delta
- `docs` — documentation
- `build`, `ci`, `chore`, `style`, `test`, `revert`

Subject is lowercase by convention but not enforced; header max 100
chars.

## Commit signing

Recommended but not required. Configure once:

```bash
git config --global commit.gpgsign true
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
```

## Releases

Versioning is automated by [release-please](https://github.com/googleapis/release-please)
using your conventional commits. When you merge a `feat:` or `fix:`
into `main`, release-please opens (or updates) a release PR. Merging
that release PR:

- Bumps the version in `package.json`
- Updates `CHANGELOG.md`
- Tags the commit `vX.Y.Z`
- Triggers `build-images.yml` for production

Hidden commit types (`test`, `chore`, `style`) don't bump the version.

## Code style

- Prettier is the formatter (config in `.prettierrc.json`)
- ESLint runs via Next.js's `next lint` for the storefront
- TypeScript strict mode is on; prefer narrow types over `any`
- No emojis in code or docs unless the existing context already uses
  them

## Reporting issues

- **Bugs**: use the issue template, include reproduction steps
- **Security**: see [SECURITY.md](./SECURITY.md) — please do **not**
  open a public issue for vulnerabilities
- **Questions**: GitHub Discussions
