<div align="center">

```
 ██████╗ ██████╗ ███████╗ ██████╗██╗   ██╗██████╗  █████╗
██╔═══██╗██╔══██╗██╔════╝██╔════╝██║   ██║██╔══██╗██╔══██╗
██║   ██║██████╔╝███████╗██║     ██║   ██║██████╔╝███████║
██║   ██║██╔══██╗╚════██║██║     ██║   ██║██╔══██╗██╔══██║
╚██████╔╝██████╔╝███████║╚██████╗╚██████╔╝██║  ██║██║  ██║
 ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
```

**The Dark Operating System for Onchain Organizations**

*"See Only What You're Meant To."*

[![Arbitrum Sepolia](https://img.shields.io/badge/Network-Arbitrum%20Sepolia-1b4add?style=for-the-badge&logo=arbitrum)](https://sepolia.arbiscan.io)
[![FHE Powered](https://img.shields.io/badge/Powered%20By-Fhenix%20CoFHE-00ff88?style=for-the-badge)](https://fhenix.io)
[![Wave 1](https://img.shields.io/badge/Wave%201-LIVE-brightgreen?style=for-the-badge)](https://arbiscan.io)
[![License MIT](https://img.shields.io/badge/License-MIT-white?style=for-the-badge)](LICENSE)

</div>

---

## ◆ What is OBSCURA?

Public blockchains have a $500M privacy architecture problem. Institutions **cannot** run payrolls, manage treasuries, or execute trades on transparent rails — not "won't," *can't*. Every salary, every bid, every position — readable by anyone with a block explorer.

**OBSCURA** is the Dark Operating System for onchain organizations: a unified dashboard of five encrypted modules that make sensitive business operations viable on public chains. Powered by **Fhenix CoFHE** (Coprocessor Fully Homomorphic Encryption), OBSCURA performs all computations directly on ciphertext — the data never decrypts on-chain.

```
Camera Obscura (n.) — the original device for selective revelation.
Data stays dark. You reveal only what's permitted. 
```

---

## ◆ Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           OBSCURA  DASHBOARD                                  │
│         Premium Dark UI  ·  "What's Private?" Panel  ·  Privacy Center        │
├──────────┬────────────┬─────────────┬──────────────┬───────────────────────── ┤
│  Wave 1  │   Wave 2   │   Wave 3    │    Wave 4    │        Wave 5             │
│  ✅ LIVE │  🔒 SOON   │  🔒 SOON   │   🔒 SOON   │      🔒 SOON              │
│          │            │             │              │                           │
│ Obscura  │  Obscura   │   Obscura   │   Obscura    │      Obscura              │
│   Pay    │    Vote    │    Vault    │    Trust     │       Mind                │
│          │            │             │              │                           │
│ Payments │ Governance │    DeFi     │ RWA/Comply   │      AI Inference         │
│add,sub  │ add,public │ gt,gte,sel  │ eq,gte,allow │ mul,add,div,square        │
├──────────┴────────────┴─────────────┴──────────────┴───────────────────────── ┤
│          ObscuraPermissions · $OBS FHERC20 · Privacy Center (ACL)             │
│                     CoFHE / FHE.sol / @cofhe/sdk                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                    Arbitrum Sepolia (421614)  ·  Base Sepolia                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### How FHE Works in OBSCURA

```
     Browser (User)
         │
         │  1. Encrypt amount via @cofhe/sdk
         │     → InEuint64 { ctHash, securityZone, utype, signature }
         ▼
  Smart Contract (Arb Sepolia)
         │
         │  2. FHE.add(balance, salary)     — compute on ciphertext
         │  3. FHE.allow(balance, employee) — ACL: only employee can decrypt
         │  4. FHE.allowThis(balance)       — contract retains future access
         ▼
  Threshold Network (CoFHE Nodes)
         │
         │  5. Threshold decrypt with ECDSA signature
         ▼
  Employee Browser
         │
         │  6. decryptForView(ctHash).withPermit().execute()
         │     → plaintext salary revealed only to the employee
         ▼
         💚 Salary visible to employee only — Arbiscan shows nothing
```

---

## ◆ Deployed Contracts (Arbitrum Sepolia)

| Contract | Address | Explorer |
|----------|---------|----------|
| **ObscuraPay** | `0x2741bAF6F51e5Ab67E81DdDCb1439679Bebd2d2F` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x2741bAF6F51e5Ab67E81DdDCb1439679Bebd2d2F) |
| **ObscuraToken** | `0xc05238b304409bC549fd8138301a2E977BaD8Cb3` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xc05238b304409bC549fd8138301a2E977BaD8Cb3) |

> **Chain ID:** 421614 · **Redeployed:** 2026-03-30 (v2) · **Deployer:** `0xf76e6B0920e9332fF4410f6dD53F01722AbC71a3`

---

## ◆ Wave Roadmap

### 🌊 Wave 1 — ObscuraPay — ✅ LIVE
**Encrypted Enterprise Payroll · Arbitrum Sepolia**

> *"Any employer pays employees → Arbiscan shows nothing → employee decrypts their salary with a single signature."*

- **Open access**: any connected wallet can act as employer — no deployer lock
- Encrypted salary payments via `FHE.add()` — amounts never visible on-chain
- Only the employee can decrypt their own balance (EIP-712 permit-gated)
- Auditor view: aggregate payroll totals only — zero individual salary exposure
- Batch payroll: pay up to 50 employees in a single transaction
- **Daily `$OBS` faucet**: any wallet claims 100 `$OBS` per 24 hours — no cost, no owner permission
- `ObscuraPermissions.sol`: reusable role-based ACL foundation (ADMIN / EMPLOYEE / AUDITOR)
- `$OBS` encrypted token: confidential balances and transfers via `euint64`
- **"What's Private?" panel**: ciphertext handles + ACL permissions visible on every page
- FHE Ops: `asEuint64`, `add`, `sub`, `isInitialized`, `allow`, `allowThis`

---

### 🌊 Wave 2 — ObscuraVote — 🔒 Coming Soon
**Coercion-Resistant Confidential Governance**

- `$OBS` token holders cast encrypted votes (`1` = yes, `0` = no)
- `FHE.add()` homomorphic tally — contract never knows individual votes
- **Anti-coercion revote**: change your vote until deadline — coercer can't verify
- `FHE.allowPublic(tally)` after deadline → threshold decrypt reveals aggregate only
- Voting weight tied to `$OBS` balance earned via ObscuraPay
- FHE Ops: `add`, `allowPublic`

---

### 🌊 Wave 3 — ObscuraVault — 🔒 Coming Soon
**MEV-Protected Confidential DeFi (30-day marathon)**

- Encrypted vault: deposit ETH → receive encrypted `$OBS` position → hidden yield
- **Sealed-bid auction**: encrypted bids → `FHE.gt()` comparison → `FHE.select()` winner routing → zero MEV extraction
- Vault positions feed governance weight in ObscuraVote
- FHE Ops: `gt`, `gte`, `select`, `add`, `sub`

---

### 🌊 Wave 4 — ObscuraTrust — 🔒 Coming Soon
**Selective Disclosure & RWA Compliance**

- Encrypted identity: KYC as `ebool` + jurisdiction as `euint8`
- Compliance checks via `FHE.gte()` without revealing the underlying data
- **Selective disclosure**: `FHE.allow(data, auditorAddress)` for scoped regulatory access
- **Audit signatures**: time-scoped cryptographic view keys for regulators
- FHE Ops: `eq`, `gte`, `allow`, `allowTransient`

---

### 🌊 Wave 5 — ObscuraMind — 🔒 Coming Soon
**Privacy-Preserving AI Credit Scoring**

- Pre-trained ML weights as `euint64` → `FHE.mul()` weighted features → aggregate risk score
- **Cross-module inference**: pulls encrypted data from Pay (salary history), Vault (positions), Vote (governance activity)
- Encrypted composite credit score feeds under-collateralized lending in ObscuraVault
- FHE Ops: `mul`, `add`, `div`, `gte`, `select`, `square`

---

## ◆ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Arbitrum Sepolia 421614 |
| **FHE Protocol** | Fhenix CoFHE · `@fhenixprotocol/cofhe-contracts ^0.1.0` |
| **Smart Contracts** | Solidity 0.8.25 · FHE.sol · evmVersion `cancun` |
| **Frontend** | React 18 · Vite 5 · TypeScript 5 |
| **Wallet Integration** | wagmi 3.6.0 · viem 2 · `injected()` + `walletConnect()` |
| **Client SDK** | `@cofhe/sdk ^0.4.0` — encrypt inputs, decrypt with permits |
| **Styling** | Tailwind CSS · shadcn/ui · Dark glassmorphism |
| **Testing** | Hardhat · `@cofhe/hardhat-cofhe` (local CoFHE mock) |

---

## ◆ Project Structure

```
OBSCURA/
├── contracts-hardhat/
│   ├── contracts/
│   │   ├── ObscuraPermissions.sol   ← Role-based ACL (reused all waves)
│   │   ├── ObscuraToken.sol         ← $OBS encrypted token + daily faucet
│   │   └── ObscuraPay.sol           ← Wave 1: open-access encrypted payroll
│   ├── tasks/
│   │   ├── deploy.ts                ← npx hardhat deploy-obscura
│   │   └── interact.ts              ← scripted interactions
│   ├── test/
│   │   ├── ObscuraPay.test.ts
│   │   └── ObscuraPermissions.test.ts
│   ├── deployments/
│   │   └── arb-sepolia.json         ← recorded contract addresses
│   └── hardhat.config.ts
│
└── frontend/obscura-os-main/
    ├── src/
    │   ├── App.tsx                  ← wagmi + QueryClient provider stack
    │   ├── config/
    │   │   ├── wagmi.ts             ← wagmi createConfig (Arb Sepolia)
    │   │   └── contracts.ts         ← ABIs + contract addresses from .env
    │   ├── pages/
    │   │   ├── Index.tsx            ← Landing page
    │   │   ├── PayPage.tsx          ← ObscuraPay dashboard (all users)
    │   │   ├── DocsPage.tsx         ← Documentation
    │   │   └── NotFound.tsx
    │   ├── components/
    │   │   ├── wallet/WalletConnect.tsx    ← Native wagmi wallet button
    │   │   ├── pay/
    │   │   │   ├── PayrollForm.tsx         ← Encrypt & pay employee
    │   │   │   ├── MintObsForm.tsx         ← Owner: mint custom $OBS amount
    │   │   │   ├── ClaimDailyObsForm.tsx   ← Any wallet: claim 100 $OBS/24h
    │   │   │   ├── BalanceReveal.tsx       ← Decrypt payroll balance
    │   │   │   └── ObsBalanceReveal.tsx    ← Decrypt $OBS balance
    │   │   ├── HeroSection.tsx
    │   │   ├── PrivacyPanel.tsx            ← "What's Private?" panel
    │   │   ├── WaveModules.tsx             ← 5-module nav grid
    │   │   ├── ArchitectureDiagram.tsx     ← FHE flow diagram
    │   │   └── DataTicker.tsx              ← Encrypted data stream visual
    │   └── hooks/
    │       ├── useDecryptBalance.ts        ← Payroll decrypt + typed error handling
    │       ├── useDecryptObsBalance.ts     ← $OBS decrypt + typed error handling
    │       ├── useEncryptedPayroll.ts      ← FHE encrypt + pay transaction
    │       └── useMintObs.ts              ← FHE encrypt + mint transaction
    ├── package.json
    └── vite.config.ts
```

---

## ◆ Quick Start

### Prerequisites
- Node.js ≥ 18
- MetaMask or any EVM wallet
- Arbitrum Sepolia testnet ETH ([Chainlink Faucet](https://faucets.chain.link/arbitrum-sepolia))

### Run Frontend

```bash
cd frontend/obscura-os-main
npm install --legacy-peer-deps
npm run dev          # → http://localhost:8080
```

### Deploy Contracts

```bash
cd contracts-hardhat
npm install

# Create .env
echo "PRIVATE_KEY=0xYOUR_KEY" > .env
echo "ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc" >> .env

# Compile
npx hardhat compile

# Deploy both contracts
npx hardhat deploy-obscura --network arb-sepolia
```

### Environment Variables

```env
# contracts-hardhat/.env
PRIVATE_KEY=0x...
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# frontend/obscura-os-main/.env
VITE_OBSCURA_PAY_ADDRESS=0x2741bAF6F51e5Ab67E81DdDCb1439679Bebd2d2F
VITE_OBSCURA_TOKEN_ADDRESS=0xc05238b304409bC549fd8138301a2E977BaD8Cb3
VITE_CHAIN_ID=421614
```

---

## ◆ Smart Contract Overview

### ObscuraPermissions.sol

The foundation ACL shared across all five waves:

```solidity
enum Role { NONE, ADMIN, EMPLOYEE, AUDITOR }
mapping(address => Role) public roles;

function grantRole(address user, Role role) external onlyOwner {}
function revokeRole(address user) external onlyOwner {}
function _grantDecrypt(euint64 handle, address who) internal { FHE.allow(handle, who); }
function _retainAccess(euint64 handle) internal { FHE.allowThis(handle); }
```

### ObscuraPay.sol

**Open to any wallet** — any connected address can act as an employer:

```solidity
mapping(address => euint64) private encryptedBalances;
euint64 private totalPayroll;

// Any wallet pays an employee — amount encrypted client-side
function payEmployee(address emp, InEuint64 calldata encSalary) external

// Pay up to 50 employees in one tx
function batchPay(address[] calldata emps, InEuint64[] calldata salaries) external

// Employee reads their own encrypted balance handle
function getMyBalance() external view returns (euint64)

// Owner grants audit access to an address
function grantAuditAccess(address auditor) external onlyOwner

// Auditor gets aggregate total only (never individual salaries)
function getAggregateTotal() external view onlyRole(Role.AUDITOR) returns (euint64)

// Event captures who paid (even though amounts are encrypted)
event EmployeePaid(address indexed employer, address indexed employee)
```

### ObscuraToken.sol ($OBS)

**Encrypted token with public daily faucet:**

```solidity
uint64 public constant DAILY_CLAIM_AMOUNT = 100;
uint256 public constant CLAIM_COOLDOWN = 24 hours;

// Owner mints custom encrypted amount
function mint(address to, InEuint64 calldata amount) external onlyOwner

// Any wallet — 100 $OBS once per 24 hours — no cost, no owner permission
function claimDailyTokens() external

// Seconds until next claim (0 = available now)
function nextClaimIn() external view returns (uint256)

// Encrypted transfer to another address
function confidentialTransfer(address to, InEuint64 calldata amount) external

// Read caller's encrypted balance handle
function balanceOf() external view returns (euint64)
```

### InEuint64 Input Struct

```solidity
// The 4-field struct that @cofhe/sdk produces client-side:
struct InEuint64 {
    uint256 ctHash;        // ciphertext hash
    uint8 securityZone;    // always 0 for standard use
    uint8 utype;           // type identifier
    bytes signature;       // Threshold Network signature
}
```

---

## ◆ ACL Patterns Used

```solidity
FHE.allow(balance, employee);     // ← employee can decrypt their own salary
FHE.allowThis(balance);           // ← contract can modify next transaction
FHE.allow(totalPayroll, auditor); // ← auditor sees only aggregate
```

> The key invariant: **Arbiscan shows ciphertext hashes only. Zero plaintext values leak on-chain.**

---

## ◆ Frontend Architecture

```
WagmiProvider (wagmi 3.6.0, Arb Sepolia, native connectors)
  └── QueryClientProvider (TanStack Query)
        └── BrowserRouter
              ├── / → Landing (HeroSection, WaveModules, PrivacyPanel)
              ├── /pay → ObscuraPay dashboard
              ├── /docs → Documentation
              └── /privacy → Privacy Center
```

### PayPage Tabs

| Tab | Who Sees It | What's Available |
|-----|-------------|-----------------|
| **Employer** | All wallets | Pay Employee · Batch Pay · Claim 100 $OBS · (Owner only: Mint $OBS) |
| **Employee** | All wallets | Claim 100 $OBS · Decrypt Payroll Balance · Decrypt $OBS Balance |
| **Auditor** | Auditor wallets | Decrypt Aggregate Total |

### Wallet Button States

| State | Display |
|-------|---------|
| Disconnected | `Connect Wallet` → shows MetaMask + WalletConnect options |
| Wrong network | `Switch to Arb Sepolia` → auto-switches via `useSwitchChain()` |
| Connected | `0x1234...5678` + ETH balance + chain label · `×` to disconnect |

---

## ◆ Vite Config — Critical for CoFHE

`@cofhe/sdk` uses `new Worker(new URL(...))` and CJS-only transitive deps. Required config:

```typescript
// vite.config.ts
optimizeDeps: {
  exclude: ["@cofhe/sdk"],           // MUST exclude — Worker URL issue
  include: [
    "iframe-shared-storage",          // CJS-only, constructClient export
    "tweetnacl",                      // CJS-only, sealing keypair generation
    "zustand/vanilla",                // CJS, permit store
    "zustand/middleware",             // CJS, permit store
    "immer",                          // CJS, permit store
  ],
},
```

After any `optimizeDeps` change: `Remove-Item -Recurse -Force node_modules/.vite`

---

## ◆ End-to-End Test Flow

1. **Connect** MetaMask on Arbitrum Sepolia at `http://localhost:8080/pay`
2. **Employer tab** → enter any address + amount → **Encrypt & Pay** → confirm 2 MetaMask prompts
3. **Employee tab** → **Claim 100 $OBS** → confirm 1 gas tx (no FHE encrypt needed — trivial encryption)
4. **Employee tab** → **Sign Permit & Decrypt** on Payroll Balance → EIP-712 sign (no gas) → salary revealed
5. **Employee tab** → **Sign Permit & Decrypt $OBS** → sign → 100 $OBS revealed
6. **Employer tab** → **Grant Audit Access** for an auditor address → confirm tx
7. **Auditor tab** (switch wallets) → **Decrypt Aggregate Total** → sign permit → total payroll revealed
8. Verify on [Arbiscan](https://sepolia.arbiscan.io): events show addresses only — zero amounts on-chain

---

## ◆ Key Learnings & Gotchas

| Problem | Fix |
|---------|-----|
| `Cannot read properties of undefined (reading 'keyPair')` | Add `tweetnacl`, `zustand/*`, `immer` to `optimizeDeps.include` |
| `constructClient not exported` | Add `iframe-shared-storage` to `optimizeDeps.include` |
| `msg.sender = address(0)` on view calls | Pass `account: address` to every `useReadContract` that uses `msg.sender` internally |
| `max fee per gas less than block base fee` | Fetch `estimateFeesPerGas()` after FHE encrypt, apply 30% buffer |
| `CofheErrorCode.PermitInvalid` not found | Use `InvalidPermitData` and `InvalidPermitDomain` instead |
| `euint64` returns hex string not bigint | Declare return type as `uint256` (not `bytes32`) in JS ABI |
| Stale `cofheClient` on wallet switch | Always call `cofheClient.connect(publicClient, walletClient)` after creation |
| `ERR_ABORTED 504` after `optimizeDeps` change | Kill server → delete `.vite` cache → restart → hard-refresh browser |

---

> *OBSCURA doesn't retrofit privacy. It was born in the dark.*

---

<div align="center">

Made with 🔒 by the OBSCURA team

[Fhenix CoFHE Docs](https://cofhe-docs.fhenix.zone) · [Arbiscan Sepolia](https://sepolia.arbiscan.io) · [Fhenix Discord](https://discord.com/invite/FuVgxrvJMY)

</div>
