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

| Contract | Address | Purpose | Explorer |
|----------|---------|---------|----------|
| **ObscuraToken** | `0xD15770A24447677D42dF6cfD09bd2fb96b34E712` | $OBS FHERC20 + operator model + daily faucet | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xD15770A24447677D42dF6cfD09bd2fb96b34E712) |
| **ObscuraPay** | `0x91CdD9a481C732bEB09Ce039da23DC11e83547a4` | Encrypted payroll + payment history | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x91CdD9a481C732bEB09Ce039da23DC11e83547a4) |
| **ObscuraEscrow** | `0xa1fF40D70089A6AE45BC6824bca5C54bB7E7059A` | Encrypted escrow engine + silent failure | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xa1fF40D70089A6AE45BC6824bca5C54bB7E7059A) |
| **ObscuraConditionResolver** | `0xd9aDaab0E9660777B979D4C44294bE07E10470c8` | Timelock + approval escrow conditions | [View on Arbiscan](https://sepolia.arbiscan.io/address/0xd9aDaab0E9660777B979D4C44294bE07E10470c8) |

> **Chain ID:** 421614 · **Deployed:** v3 · **Deployer:** `0xf76e6B0920e9332fF4410f6dD53F01722AbC71a3`

---

## ◆ Wave Roadmap

### 🌊 Wave 1 — ObscuraPay — ✅ LIVE (v3)
**Complete Encrypted Payment Platform · 4 Contracts · Arbitrum Sepolia**

> *"Any employer pays employees → send P2P transfers → create encrypted escrows → Arbiscan shows nothing."*

**Core Payroll:**
- **Open access**: any connected wallet can act as employer — no deployer lock
- Encrypted salary payments via `FHE.add()` — amounts never visible on-chain
- Only the employee can decrypt their own balance (EIP-712 permit-gated)
- Auditor view: aggregate payroll totals only — zero individual salary exposure
- Batch payroll: pay up to 50 employees in a single transaction
- **Payment history**: on-chain `PaymentRecord` log with per-address indexing

**P2P Transfers & Operator Model:**
- **Confidential P2P transfers**: send encrypted `$OBS` to any wallet — amount hidden on-chain
- **Operator model**: time-limited approvals via `setOperator(address, expiry)` for contract-initiated `confidentialTransferFrom`

**Encrypted Escrow Engine:**
- **ObscuraEscrow**: create escrows where owner (`eaddress`), amount (`euint64`), and payment status are all FHE ciphertexts
- **Silent failure pattern**: unauthorized redemption returns 0 tokens via `FHE.select()` — no revert, indistinguishable from success
- **Pluggable conditions**: `ObscuraConditionResolver` supports timelock (release after deadline) and approval (creator approves release) conditions
- Escrow lifecycle: create → fund (homomorphic `FHE.add`) → redeem (silent failure) → cancel

**Token & Infrastructure:**
- **Daily `$OBS` faucet**: any wallet claims 100 `$OBS` per 24 hours — no cost, no owner permission
- `ObscuraPermissions.sol`: reusable role-based ACL foundation (ADMIN / EMPLOYEE / AUDITOR)
- `$OBS` encrypted token: confidential balances and transfers via `euint64`
- **"What's Private?" panel**: 4 encrypted data items (balance, aggregate, escrow owner+amount, P2P transfer)
- FHE Ops: `asEuint64`, `asEaddress`, `asEbool`, `add`, `sub`, `eq`, `gte`, `select`, `and`, `not`, `isInitialized`, `allow`, `allowThis`

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
│   │   ├── ObscuraPermissions.sol        ← Role-based ACL (reused all waves)
│   │   ├── ObscuraToken.sol              ← $OBS FHERC20 + operator model + daily faucet
│   │   ├── ObscuraPay.sol                ← Encrypted payroll + payment history
│   │   ├── ObscuraEscrow.sol             ← Encrypted escrow engine + silent failure
│   │   └── ObscuraConditionResolver.sol  ← Pluggable escrow release conditions
│   ├── tasks/
│   │   ├── deploy.ts                     ← Deploys all 4 contracts
│   │   └── interact.ts                   ← Scripted interactions
│   ├── deployments/
│   │   └── arb-sepolia.json              ← Recorded contract addresses
│   └── hardhat.config.ts
│
└── frontend/obscura-os-main/
    ├── src/
    │   ├── App.tsx                       ← wagmi + QueryClient provider stack
    │   ├── config/
    │   │   ├── wagmi.ts                  ← wagmi createConfig (Arb Sepolia)
    │   │   └── contracts.ts              ← All 4 contract ABIs + addresses
    │   ├── lib/
    │   │   ├── fhe.ts                    ← @cofhe/sdk wrappers (encrypt, encryptAddress)
    │   │   └── utils.ts                  ← cn() helper
    │   ├── pages/
    │   │   ├── Index.tsx                 ← Landing page
    │   │   ├── PayPage.tsx               ← 5-tab dashboard (Dashboard/Pay/Receive/Escrows/Admin)
    │   │   ├── DocsPage.tsx              ← Documentation
    │   │   └── NotFound.tsx
    │   ├── components/
    │   │   ├── wallet/WalletConnect.tsx   ← Native wagmi wallet button
    │   │   ├── pay/
    │   │   │   ├── PayrollForm.tsx        ← Encrypt & pay employee
    │   │   │   ├── MintObsForm.tsx        ← Owner: mint custom $OBS amount
    │   │   │   ├── ClaimDailyObsForm.tsx  ← Any wallet: claim 100 $OBS/24h
    │   │   │   ├── BalanceReveal.tsx      ← Decrypt payroll balance
    │   │   │   ├── ObsBalanceReveal.tsx   ← Decrypt $OBS balance
    │   │   │   ├── TransferForm.tsx       ← P2P confidential $OBS transfers
    │   │   │   ├── CreateEscrowForm.tsx   ← Create encrypted escrows
    │   │   │   ├── EscrowActions.tsx      ← Fund / redeem / cancel escrows
    │   │   │   ├── EscrowList.tsx         ← Browse recent escrows
    │   │   │   ├── DashboardStats.tsx     ← Stats overview + privacy status
    │   │   │   ├── EmployeeList.tsx       ← List paid employees
    │   │   │   └── AuditView.tsx          ← Auditor aggregate decrypt
    │   │   ├── shared/AsyncStepper.tsx    ← FHE operation progress
    │   │   ├── HeroSection.tsx
    │   │   ├── PrivacyPanel.tsx           ← "What's Private?" panel
    │   │   ├── WaveModules.tsx            ← 5-module nav grid
    │   │   ├── ArchitectureDiagram.tsx    ← FHE flow diagram
    │   │   └── DataTicker.tsx             ← Encrypted data stream visual
    │   └── hooks/
    │       ├── useDecryptBalance.ts       ← Payroll decrypt + typed errors
    │       ├── useDecryptObsBalance.ts    ← $OBS decrypt + typed errors
    │       ├── useEncryptedPayroll.ts     ← FHE encrypt + pay transaction
    │       ├── useMintObs.ts             ← FHE encrypt + mint transaction
    │       ├── useConfidentialEscrow.ts   ← Create/fund/redeem/cancel escrows
    │       ├── useConfidentialTransfer.ts ← P2P transfers + operator model
    │       └── usePaymentHistory.ts       ← On-chain payment history
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

# Deploy all 4 contracts
npx hardhat deploy-obscura --network arb-sepolia
```

### Environment Variables

```env
# contracts-hardhat/.env
PRIVATE_KEY=0x...
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# frontend/obscura-os-main/.env
VITE_OBSCURA_PAY_ADDRESS=0x91CdD9a481C732bEB09Ce039da23DC11e83547a4
VITE_OBSCURA_TOKEN_ADDRESS=0xD15770A24447677D42dF6cfD09bd2fb96b34E712
VITE_OBSCURA_ESCROW_ADDRESS=0xa1fF40D70089A6AE45BC6824bca5C54bB7E7059A
VITE_OBSCURA_CONDITION_RESOLVER_ADDRESS=0xd9aDaab0E9660777B979D4C44294bE07E10470c8
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

### ObscuraPay.sol (v3)

**Open to any wallet** — with payment history tracking:

```solidity
mapping(address => euint64) private encryptedBalances;
euint64 private totalPayroll;
PaymentRecord[] public paymentLog;

struct PaymentRecord { address from; address to; uint256 timestamp; }

function payEmployee(address emp, InEuint64 calldata encSalary) external
function batchPay(address[] calldata emps, InEuint64[] calldata salaries) external
function getMyBalance() external view returns (euint64)
function grantAuditAccess(address auditor) external onlyOwner
function getAggregateTotal() external view onlyRole(Role.AUDITOR) returns (euint64)

// Payment history queries
function getPaymentCount() external view returns (uint256)
function getMyPaymentCount() external view returns (uint256)
function getMyPaymentIndices(uint256 offset, uint256 limit) external view returns (uint256[] memory)
function getPaymentRecord(uint256 index) external view returns (address, address, uint256)
```

### ObscuraToken.sol ($OBS — v3)

**Encrypted token + operator model + daily faucet:**

```solidity
uint64 public constant DAILY_CLAIM_AMOUNT = 100;
uint256 public constant CLAIM_COOLDOWN = 24 hours;

function mint(address to, InEuint64 calldata amount) external onlyOwner
function claimDailyTokens() external
function nextClaimIn() external view returns (uint256)
function confidentialTransfer(address to, InEuint64 calldata amount) external
function balanceOf() external view returns (euint64)

// Operator model — time-limited approvals
function setOperator(address operator, uint256 expiry) external
function isOperator(address operator, address holder) external view returns (bool)
function confidentialTransferFrom(address from, address to, InEuint64 calldata amount) external
```

### ObscuraEscrow.sol

**Encrypted escrow with silent failure pattern:**

```solidity
struct Escrow {
    eaddress owner;       // Encrypted recipient address
    eaddress creator;     // Encrypted creator address
    euint64  amount;      // Encrypted target amount
    euint64  paidAmount;  // Encrypted cumulative payments
    ebool    isRedeemed;  // Encrypted redemption flag
    bool     exists;      // Only public field
    address  creatorPlain;
}

function createEscrow(InEaddress, InEuint64, address resolver, bytes resolverData) external
function fundEscrow(uint256 escrowId, InEuint64 amount) external
function redeemEscrow(uint256 escrowId) external   // Silent failure: returns 0 if unauthorized
function cancelEscrow(uint256 escrowId) external
```

### ObscuraConditionResolver.sol

**Pluggable escrow release conditions:**

```solidity
enum ConditionType { NONE, TIME_LOCK, APPROVAL }

function onConditionSet(uint256 escrowId, bytes data) external onlyEscrow
function isConditionMet(uint256 escrowId) external view returns (bool)
function approve(uint256 escrowId) external  // APPROVAL type only
```

### Input Structs

```solidity
struct InEuint64 {
    uint256 ctHash; uint8 securityZone; uint8 utype; bytes signature;
}
struct InEaddress {
    uint256 ctHash; uint8 securityZone; uint8 utype; bytes signature;
}
```

---

## ◆ ACL Patterns Used

```solidity
FHE.allow(balance, employee);     // ← employee can decrypt their own salary
FHE.allowThis(balance);           // ← contract can modify next transaction
FHE.allow(totalPayroll, auditor); // ← auditor sees only aggregate

// Silent failure pattern (escrow redemption)
ebool valid = FHE.and(FHE.and(isOwner, hasFunds), notRedeemed);
euint64 redeemAmount = FHE.select(valid, amount, FHE.asEuint64(0));
// ↑ Returns 0 if unauthorized — no revert, indistinguishable from success
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

### PayPage Tabs (5-Tab Layout)

| Tab | Who Sees It | What's Available |
|-----|-------------|------------------|
| **Dashboard** | All wallets | Stats overview (employees, payments, escrows, claims, mints) · Privacy status · Claim $OBS |
| **Pay** | All wallets | P2P Confidential Transfer · Pay Employee · Batch Pay · Employee List |
| **Receive** | All wallets | Claim 100 $OBS · Decrypt Payroll Balance · Decrypt $OBS Balance |
| **Escrows** | All wallets | Create Escrow · Fund / Redeem / Cancel · Browse Escrows |
| **Admin** | Owner/Auditor | Audit Aggregate View · Mint $OBS |

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
2. **Dashboard tab** → view stats: employees paid, payment records, active escrows, daily claims
3. **Pay tab** → enter recipient + amount → **P2P Transfer** → encrypted $OBS sent, amount hidden on-chain
4. **Pay tab** → enter employee address + salary → **Encrypt & Pay** → confirm MetaMask prompts
5. **Receive tab** → **Claim 100 $OBS** → confirm 1 gas tx (trivial encryption)
6. **Receive tab** → **Sign Permit & Decrypt** on Payroll Balance → salary revealed
7. **Receive tab** → **Sign Permit & Decrypt $OBS** → 100 $OBS revealed
8. **Escrows tab** → Create escrow with timelock condition → owner address encrypted via `eaddress`
9. **Escrows tab** → Fund escrow → redeem (authorized = tokens, unauthorized = silent 0)
10. **Admin tab** → **Decrypt Aggregate Total** → sign permit → total payroll revealed
11. Verify on [Arbiscan](https://sepolia.arbiscan.io): events show addresses only — zero amounts on-chain

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
