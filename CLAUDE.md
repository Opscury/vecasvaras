# Working rules for this repo

## Git: one branch only — `main`

- **Never create branches.** No feature branches, no `claude/*` branches, no worktrees. All work is committed straight to `main`.
- **Before starting any work, sync:** `git fetch origin` and `git pull --ff-only origin main`. If the local copy is behind, pull first — never build on a stale checkout.
- **Before pushing,** fetch again. If `origin/main` has moved, pull and integrate (keep what is already on `main`), re-run `npm test`, then push. Never force-push.
- `main` deploys to Netlify (vecasvaras.protu.lv) on every push, and the deploy runs `npm test` first.
- Commits are authored as `Valdis <viska.valdis@gmail.com>`.

## Folklore

Anything the game presents as tradition is quoted from a source — see `FOLKLORE.md`. The player-facing list is `src/content/avoti.ts` (the «Avoti» spread in the beliefs book and `/avoti/`).
