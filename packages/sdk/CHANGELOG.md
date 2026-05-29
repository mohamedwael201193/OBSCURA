# Changelog

All notable changes to `@obscura-fhe/sdk` are documented in this file.

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
