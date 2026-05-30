# Changelog

All notable changes to `@obscura-fhe/sdk` are documented in this file.

## [1.0.1] - 2026-05-29

### Fixed

- **Vote module:** `getProposalCount()` now reads on-chain `nextProposalId()` instead of non-existent `proposalCount()` (verified against Arbitrum Sepolia ObscuraVote `0xe358…1730`)

### Added

- `ActivityModule.isConfigured()` — check Supabase credentials before querying
- Clearer activity error messages with default Supabase URL and setup instructions
- Module examples: `reputation`, `activity`, `notifications`, `pay`, `credit`, `vote`
- README: requirements matrix, viem rpcUrl/transport examples, TypeScript `verbatimModuleSyntax` guidance

### Docs

- Developer portal quick-start, SDK onboarding, and SDK reference updated with hidden requirements

## [1.0.0] - 2026-05-29

### Added

- Initial public release of the official Obscura TypeScript SDK
- **Pay module** — shielded balance reads, shield/unshield/transfer transaction builders
- **Credit module** — canonical market address, supply/borrow/repay transaction builders
- **Vote module** — proposal reads, cast vote and delegate transaction builders
- **Reputation module** — off-chain reputation summary via obscura-api
- **Activity module** — Supabase activity feed with pay/credit/vote event filters
- **Notifications module** — VAPID key, push prefs, subscribe/unsubscribe
- Injectable `FheProvider` interface for CoFHE encrypt/decrypt (host-supplied)
- Arbitrum Sepolia defaults (chain, RPC, API, contract addresses)
- ESM + CJS dual build with TypeScript declarations
- Framework-agnostic design (viem peer dependency, no React/wagmi)
