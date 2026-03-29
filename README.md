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
| **ObscuraPay** | `0x05545F026b75f03aE9Cf1eA8a8373473c94ed323` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x05545F026b75f03aE9Cf1eA8a8373473c94ed323) |
| **ObscuraToken** | `0x068bB96e849F0DE3D49944Ec0F4aEd3D6B165770` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x068bB96e849F0DE3D49944Ec0F4aEd3D6B165770) |

> **Chain ID:** 421614 · **Deployed:** 2026-03-29 · **Deployer:** `0xf76e6B0920e9332fF4410f6dD53F01722AbC71a3`

---

## ◆ Wave Roadmap

### 🌊 Wave 1 — ObscuraPay — ✅ LIVE
**Encrypted Enterprise Payroll · Arbitrum Sepolia**

> *"Employer pays 3 contractors → Arbiscan shows nothing → contractor decrypts their salary."*

- Encrypted salary payments via `FHE.add()` — amounts never visible on-chain
- Only the employee can decrypt their own balance (EIP-712 permit-gated)
- Auditor view: aggregate payroll totals only — zero individual salary exposure
- Batch payroll: pay N employees in a single transaction
- `ObscuraPermissions.sol`: reusable role-based ACL foundation (ADMIN / EMPLOYEE / AUDITOR)
- `$OBS` token stub: FHERC20-ready with encrypted balances and confidential transfers
- **"What's Private?" panel**: ciphertext handles + ACL permissions visible on every page
- **Dynamic wallet integration**: 100+ wallets, WalletConnect, social login
- FHE Ops: `asEuint64`, `add`, `isInitialized`, `allow`, `allowThis`

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
- ObscuraID gates access to ObscuraVault premium features
- FHE Ops: `eq`, `gte`, `allow`, `allowTransient`

---

### 🌊 Wave 5 — ObscuraMind — 🔒 Coming Soon
**Privacy-Preserving AI Credit Scoring**

- Pre-trained ML weights as `euint64` → `FHE.mul()` weighted features → aggregate risk score
- **Cross-module inference**: pulls encrypted data from Pay (salary history), Vault (positions), Vote (governance activity)
- Encrypted composite credit score feeds under-collateralized lending in ObscuraVault
- Score computed entirely on ciphertext — even the model never sees plaintext inputs
- FHE Ops: `mul`, `add`, `div`, `gte`, `select`, `square`

---

## ◆ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Arbitrum Sepolia 421614 (primary) · Base Sepolia (W3+) |
| **FHE Protocol** | Fhenix CoFHE · `@fhenixprotocol/cofhe-contracts ^0.1.0` |
| **Smart Contracts** | Solidity 0.8.25 · FHE.sol · evmVersion `cancun` |
| **Frontend** | React 18 · Vite 5 · TypeScript 5 |
| **Wallet Integration** | Dynamic (100+ wallets) · wagmi 3.6.0 · viem 2 |
| **Client SDK** | `@cofhe/sdk ^0.4.0` — encrypt inputs, decrypt with permits |
| **Styling** | Tailwind CSS · shadcn/ui · Dark glassmorphism |
| **Testing** | Hardhat · `@cofhe/hardhat-plugin` (local CoFHE mock) |
| **Payments** | Privara SDK `@reineira-os/sdk` |

---

## ◆ Project Structure

```
OBSCURA/
├── contracts-hardhat/
│   ├── contracts/
│   │   ├── ObscuraPermissions.sol   ← Role-based ACL (reused all waves)
│   │   ├── ObscuraToken.sol         ← $OBS FHERC20 stub
│   │   └── ObscuraPay.sol           ← Wave 1: encrypted payroll
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
    │   ├── App.tsx                  ← Dynamic + wagmi provider stack
    │   ├── config/wagmi.ts          ← wagmi createConfig (Arb Sepolia)
    │   ├── pages/
    │   │   ├── Index.tsx            ← Landing page
    │   │   ├── PayPage.tsx          ← ObscuraPay dashboard
    │   │   ├── DocsPage.tsx         ← Documentation
    │   │   └── PrivacyPage.tsx      ← Privacy Center (ACL/permits)
    │   └── components/
    │       ├── wallet/WalletConnect.tsx  ← Dynamic-powered wallet button
    │       ├── HeroSection.tsx
    │       ├── PrivacyPanel.tsx          ← "What's Private?" panel
    │       ├── WaveModules.tsx           ← 5-module nav
    │       └── ui/                       ← shadcn/ui components
    ├── package.json
    └── vite.config.ts
```

---

## ◆ Quick Start

### Prerequisites
- Node.js ≥ 18
- An Arbitrum Sepolia wallet with testnet ETH

### Run Frontend

```bash
cd frontend/obscura-os-main
npm install
npm run dev          # → http://localhost:8080
```

### Deploy Contracts

```bash
cd contracts-hardhat
npm install

# Create .env
echo "PRIVATE_KEY=0xYOUR_KEY" > .env
echo "ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc" >> .env

# Deploy both contracts
npx hardhat deploy-obscura --network arb-sepolia
```

### Environment Variables

```env
# contracts-hardhat/.env
PRIVATE_KEY=0x...
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# frontend/obscura-os-main/.env
VITE_OBSCURA_PAY_ADDRESS=0x05545F026b75f03aE9Cf1eA8a8373473c94ed323
VITE_OBSCURA_TOKEN_ADDRESS=0x068bB96e849F0DE3D49944Ec0F4aEd3D6B165770
VITE_CHAIN_ID=421614
```

### Get Testnet ETH

> https://faucets.chain.link/arbitrum-sepolia

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

```solidity
mapping(address => euint64) private encryptedBalances;
euint64 private totalPayroll;

// Employer pays employee — amount encrypted client-side
function payEmployee(address emp, InEuint64 calldata encSalary) external onlyOwner

// Pay N employees in one tx
function batchPay(address[] calldata emps, InEuint64[] calldata salaries) external onlyOwner

// Employee reads their own encrypted balance handle
function getMyBalance() external view returns (euint64)

// Auditor gets aggregate total only (never individual salaries)
function getAggregateTotal() external view onlyRole(Role.AUDITOR) returns (euint64)
```

### InEuint64 Input Struct

```solidity
// The 4-field struct that @cofhe/sdk produces:
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
FHE.allow(balance, employee);   // ← employee can decrypt their own salary
FHE.allowThis(balance);         // ← contract can modify next transaction
FHE.allow(totalPayroll, auditor); // ← auditor sees only aggregate
```

> The key invariant: **Arbiscan shows ciphertext hashes only. Zero plaintext values leak on-chain.**

---

## ◆ Frontend Architecture

```
DynamicContextProvider (100+ wallet connections)
  └── WagmiProvider (wagmi 3.6.0, Arb Sepolia)
        └── DynamicWagmiConnector (bridges Dynamic → wagmi hooks)
              └── App
                    ├── / → Landing (HeroSection, WaveModules, PrivacyPanel)
                    ├── /pay → ObscuraPay dashboard
                    ├── /privacy → Privacy Center
                    └── /docs → Documentation
```

### Wallet Button States

| State | Display |
|-------|---------|
| Disconnected | `Connect Wallet` → opens Dynamic modal (100+ wallets) |
| Wrong network | `Switch to Arb Sepolia` → auto-switches via wagmi |
| Connected | `0x1234...5678` + ETH balance + chain label · `×` to disconnect |

---

> *OBSCURA doesn't retrofit privacy. It was born in the dark.*

---

<div align="center">

Made with 🔒 by the OBSCURA team

[X / Twitter](https://x.com) · [Fhenix Discord](https://discord.com/invite/FuVgxrvJMY)

</div>
