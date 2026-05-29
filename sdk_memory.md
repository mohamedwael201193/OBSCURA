# Obscura SDK Memory Log

> Living log for `@obscura-fhe/sdk` v1 development and release.

## Status: PUBLISHED v1.0.0

| Gate | Status |
|------|--------|
| Architecture plan | ✅ `packages/sdk/SDK_ARCHITECTURE.md` |
| Package scaffold | ✅ `packages/sdk/` |
| Build | ✅ ESM + CJS + DTS |
| Typecheck | ✅ |
| Tests | ✅ 14/14 |
| Examples | ✅ |
| Git push | ✅ `5a3985b` (initial SDK) + scope rename commit |
| npm publish | ✅ `@obscura-fhe/sdk@1.0.0` |

---

## Final Audit (2026-05-29)

### Checks passed
- `npm run typecheck` ✅
- `npm run test` ✅ 14/14
- `npm run build` ✅
- `npm pack` ✅ 10 files, 36.4 kB
- ESM import from tarball ✅
- CJS require from tarball ✅
- No secrets in package defaults ✅
- No local-path references in published files ✅
- `prepublishOnly` runs typecheck + test + build ✅

### Publish scope fix
- **Issue:** `@obscura/sdk` publish failed — `mohamed-wael` account lacks `@obscura` org access (404).
- **Fix:** Renamed to `@obscura-fhe/sdk` matching npm org [obscura-fhe](https://www.npmjs.com/settings/obscura-fhe).
- **Republish attempt:** E403 "cannot publish over previously published versions: 1.0.0" — confirms live on registry.

### Published package contents (10 files)
```
CHANGELOG.md
LICENSE
README.md
package.json
dist/index.js
dist/index.cjs
dist/index.d.ts
dist/index.d.cts
dist/index.js.map
dist/index.cjs.map
```

---

## Release Record

| Field | Value |
|-------|-------|
| **npm package** | `@obscura-fhe/sdk` |
| **Version** | `1.0.0` |
| **Access** | public |
| **Package size** | 36.4 kB (177.4 kB unpacked) |
| **npm URL** | https://www.npmjs.com/package/@obscura-fhe/sdk |
| **Install** | `npm install @obscura-fhe/sdk viem` |
| **Git commit (initial SDK)** | `5a3985b` |
| **Git commit (scope + publish)** | `689f72e` |
| **Publish timestamp (UTC)** | ~2026-05-29T22:52:00Z |
| **npm org** | obscura-fhe |

> **Note:** Original target name was `@obscura/sdk`. Published under `@obscura-fhe/sdk` because that is the owned npm organization. To use `@obscura/sdk`, claim/create the `@obscura` npm org separately.

---

## Architecture Decisions

### AD-001 through AD-007
See prior entries — unchanged.

### AD-008: npm scope `@obscura-fhe`
- **Decision:** Publish as `@obscura-fhe/sdk`, not `@obscura/sdk`.
- **Rationale:** npm org `obscura-fhe` is owned; `@obscura` scope unavailable to publish account.

---

## Public API Surface

```typescript
import { ObscuraSDK } from '@obscura-fhe/sdk';

const sdk = ObscuraSDK.create({
  supabaseAnonKey: process.env.OBSCURA_SUPABASE_ANON_KEY,
  fhe: optionalFheProvider,
  walletClient: optionalWalletClient,
});

sdk.pay | sdk.credit | sdk.vote | sdk.reputation | sdk.activity | sdk.notifications
sdk.encodeCall(call)
sdk.sendCall(call, account)
```

---

## Test Results (final)

| Run | Build | Typecheck | Tests | Example |
|-----|-------|-----------|-------|---------|
| Pre-publish | ✅ | ✅ | 14/14 | ✅ |
| prepublishOnly (on publish) | ✅ | ✅ | 14/14 | — |

---

## Security Note

npm publish token was used for CI-style publish. **Rotate the token** in npm account settings — it was exposed in chat.

---

## Remaining Work (post-v1)

- [ ] Confirm npm registry propagation + install from clean machine
- [ ] Optional: claim `@obscura` npm org and alias/republish if brand requires exact name
- [ ] Optional: `@obscura-fhe/sdk/fhe-cofhe` adapter package
- [ ] MCP layer (deferred)

---

## References

- npm: https://www.npmjs.com/package/@obscura-fhe/sdk
- npm org: https://www.npmjs.com/settings/obscura-fhe
- GitHub: https://github.com/mohamedwael201193/OBSCURA/tree/main/packages/sdk
- Architecture: `OBSCURA_PROTOCOL_ARCHITECTURE_v1.md`
