# @obscura/sdk — Publish Readiness Checklist

## Pre-publish

- [x] `npm run typecheck` passes
- [x] `npm run build` produces `dist/` with ESM + CJS + `.d.ts`
- [x] `npm run test` — 14/14 unit tests pass
- [x] `npm run example:basic` runs (live reputation + VAPID verified 2026-05-29)
- [x] `package.json` `files` includes only `dist/` and `README.md`
- [x] Peer dependency `viem ^2.0.0` documented
- [x] No secrets in defaults (Supabase anon key must be supplied by consumer)
- [x] Version semver aligned with protocol v1 (1.0.0)

## npm publish

```bash
cd packages/sdk
npm login
npm publish --access public
```

## Post-publish verification

- [ ] `npm install @obscura/sdk` in clean project
- [ ] Import resolves types correctly
- [ ] Reputation API call works against production `obscura-api`

## Address sync

When contracts redeploy, update `src/config/defaults.ts` from:
`contracts-hardhat/deployments/arb-sepolia.json`

## MCP (future)

Module surface maps 1:1 to planned MCP tools — do not publish MCP until SDK v1 is stable.
