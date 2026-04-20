import { useState } from "react";
import { motion } from "framer-motion";
import { Book, ExternalLink, Shield, Zap, Lock, FileText, Terminal, Layers, GitBranch, AlertTriangle, CheckCircle } from "lucide-react";
import ObscuraNav from "@/components/ObscuraNav";
import ObscuraFooter from "@/components/ObscuraFooter";

const sections = [
  { id: "overview", label: "Overview", icon: Book },
  { id: "wave1", label: "ObscuraPay", icon: Shield },
  { id: "wave2", label: "ObscuraVote", icon: Lock },
  { id: "contracts", label: "Deployed Contracts", icon: Terminal },
  { id: "architecture", label: "FHE Architecture", icon: Layers },
  { id: "fhe-ops", label: "FHE Operations", icon: Lock },
  { id: "roadmap", label: "Product Roadmap", icon: GitBranch },
  { id: "troubleshooting", label: "Troubleshooting", icon: AlertTriangle },
  { id: "resources", label: "Resources", icon: ExternalLink },
];

const deployedContracts = [
  // ── Wave 1 — ObscuraPay ──
  {
    name: "ObscuraToken ($OBS)",
    address: "0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2",
    purpose: "FHERC-20 governance token — encrypted balances, daily faucet, confidential P2P transfers, operator model",
    explorer: "https://sepolia.arbiscan.io/address/0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2",
  },
  {
    name: "ObscuraPay",
    address: "0x13e2e3069bF9729C8Cd239F9A5fAAb087c77C33f",
    purpose: "Encrypted payroll engine — FHE.add() salary accumulation, batch pay up to 50, role-based ACL, auditor aggregate access",
    explorer: "https://sepolia.arbiscan.io/address/0x13e2e3069bF9729C8Cd239F9A5fAAb087c77C33f",
  },
  {
    name: "ObscuraEscrow",
    address: "0x77d6f4B3250Ef6C88EC409d49dcF4e5a4DdF2187",
    purpose: "Encrypted escrow with resolver hooks — silent failure pattern, owner eaddress + amount euint64 ciphertexts",
    explorer: "https://sepolia.arbiscan.io/address/0x77d6f4B3250Ef6C88EC409d49dcF4e5a4DdF2187",
  },
  {
    name: "ObscuraConditionResolver",
    address: "0x8176549dfbE797b1C77316BFac18DAFCe42bEb8c",
    purpose: "Time-lock and approval conditions for escrow release — pluggable resolver logic",
    explorer: "https://sepolia.arbiscan.io/address/0x8176549dfbE797b1C77316BFac18DAFCe42bEb8c",
  },
  {
    name: "ConfidentialUSDC (cUSDC)",
    address: "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f",
    purpose: "FHERC-20 encrypted stablecoin — all balances stored as euint64, wrap/unwrap USDC, confidential transfers",
    explorer: "https://sepolia.arbiscan.io/address/0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f",
  },
  {
    name: "ObscuraPayStream",
    address: "0x15d28Cbad36d3aC2d898DFB28644033000F16162",
    purpose: "Encrypted payroll streams — cUSDC salary to stealth addresses, per-cycle encrypted payments",
    explorer: "https://sepolia.arbiscan.io/address/0x15d28Cbad36d3aC2d898DFB28644033000F16162",
  },
  {
    name: "ObscuraStealthRegistry",
    address: "0xa36e791a611D36e2C817a7DA0f41547D30D4917d",
    purpose: "Stealth address registry — recipients register ECDH meta-addresses for private payroll delivery",
    explorer: "https://sepolia.arbiscan.io/address/0xa36e791a611D36e2C817a7DA0f41547D30D4917d",
  },
  {
    name: "ObscuraPayrollUnderwriter",
    address: "0x8fA403DDBE7CD30C8b26348E1a41E86ABDD6088c",
    purpose: "Payroll insurance underwriter — encrypted coverage, premium calculation, dispute resolution",
    explorer: "https://sepolia.arbiscan.io/address/0x8fA403DDBE7CD30C8b26348E1a41E86ABDD6088c",
  },
  {
    name: "InsurancePool",
    address: "0x5AC95Fa097CAC0a7d98157596Aff386b30b67069",
    purpose: "Insurance liquidity pool — stakers provide payout funds, earn premiums",
    explorer: "https://sepolia.arbiscan.io/address/0x5AC95Fa097CAC0a7d98157596Aff386b30b67069",
  },
  {
    name: "ObscuraPayrollResolver",
    address: "0xC567249c8bE2C59783CD1d1F3081Eb7B03e89761",
    purpose: "Pluggable escrow release conditions — cycle-based approval for resolver-gated escrows",
    explorer: "https://sepolia.arbiscan.io/address/0xC567249c8bE2C59783CD1d1F3081Eb7B03e89761",
  },
  {
    name: "ConfidentialEscrow",
    address: "0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa",
    purpose: "V2 escrow — encrypted amount + encrypted owner, FHE.select() silent failure, resolver hooks",
    explorer: "https://sepolia.arbiscan.io/address/0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa",
  },
  {
    name: "CoverageManager",
    address: "0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6",
    purpose: "Insurance coverage management — policy lifecycle, claim adjudication",
    explorer: "https://sepolia.arbiscan.io/address/0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6",
  },
  {
    name: "PoolFactory",
    address: "0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD",
    purpose: "Factory for creating new insurance pools with configurable parameters",
    explorer: "https://sepolia.arbiscan.io/address/0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD",
  },
  {
    name: "PolicyRegistry",
    address: "0xf421363B642315BD3555dE2d9BD566b7f9213c8E",
    purpose: "On-chain policy registration and lookup for insurance coverage",
    explorer: "https://sepolia.arbiscan.io/address/0xf421363B642315BD3555dE2d9BD566b7f9213c8E",
  },
  // ── Wave 2 — ObscuraVote ──
  {
    name: "ObscuraVote (V4)",
    address: "0x5d91B5ccb581F543f7399eea1c65Dfa88b3f9B7a",
    purpose: "Encrypted governance — FHE.add() tallies, coercion-resistant revoting, time-locked results, multi-option polls",
    explorer: "https://sepolia.arbiscan.io/address/0x5d91B5ccb581F543f7399eea1c65Dfa88b3f9B7a",
  },
];

const wave1Features = [
  {
    category: "Payroll Engine",
    contract: "ObscuraPay.sol",
    items: [
      "Open access — any connected wallet acts as employer, no deployer restriction",
      "payEmployee() — salary encrypted client-side via @cofhe/sdk, FHE.add() accumulates on-chain without revealing amounts",
      "batchPay() — pay up to 50 employees in a single transaction",
      "Role-based ACL — ADMIN / EMPLOYEE / AUDITOR roles via ObscuraPermissions.sol",
      "Auditor access — grantAuditAccess() reveals aggregate payroll total only; zero individual exposure",
      "Payment history — on-chain PaymentRecord[] log with per-address indexing and pagination",
      "getMyBalance() — employees retrieve their own euint64 handle for client-side decryption",
    ],
  },
  {
    category: "$OBS Token",
    contract: "ObscuraToken.sol",
    items: [
      "FHERC20 encrypted token — all balances stored as euint64 ciphertexts; Arbiscan shows nothing",
      "Daily faucet — claimDailyTokens() dispenses 100 $OBS per wallet per 24 hours, no cost",
      "Owner mint — mint() encrypts arbitrary amounts for any recipient",
      "Confidential P2P transfers — confidentialTransfer() hides transfer amount on-chain; only sender and recipient can decrypt",
      "Operator model — setOperator(address, expiry) grants time-limited approval for delegated transfers",
      "confidentialTransferFrom() — operators execute transfers on behalf of holders within approved window",
      "nextClaimIn() — on-chain cooldown countdown for UI display",
    ],
  },
  {
    category: "Encrypted Escrow",
    contract: "ObscuraEscrow.sol",
    items: [
      "Owner address encrypted as eaddress — recipient identity fully hidden on-chain",
      "Escrow amount encrypted as euint64 — target value hidden on-chain",
      "Silent failure pattern — unauthorized redemption returns 0 tokens via FHE.select(); no revert, indistinguishable from success",
      "Homomorphic funding — fundEscrow() accumulates payments via FHE.add() without revealing individual amounts",
      "Full lifecycle — createEscrow → fundEscrow → redeemEscrow → cancelEscrow",
      "Condition hooks — resolver contract queried before any redemption; pluggable condition logic",
      "Creator cancel — creatorPlain plaintext field enables cancel authorization without decrypting anything",
    ],
  },
  {
    category: "Condition Resolver",
    contract: "ObscuraConditionResolver.sol",
    items: [
      "TIME_LOCK — escrow unlocks when block.timestamp >= absolute deadline; deadline passed as ABI-encoded uint256",
      "APPROVAL — designated approver manually calls approve(escrowId) to release the escrow",
      "onConditionSet() — called by escrow contract on creation; receives ABI-encoded condition parameters",
      "isConditionMet() — view function queried during every redemption attempt",
      "approve() — approval-condition escrows released by the designated approver address",
      "onlyEscrow modifier — callable only from the registered ObscuraEscrow contract",
    ],
  },
];

const roadmapWaves = [
  {
    wave: 2,
    name: "ObscuraVote",
    category: "Confidential Governance",
    fheOps: ["add", "allowPublic"],
    description: "Coercion-resistant on-chain governance. $OBS holders cast encrypted votes — FHE.add() tallies homomorphically without revealing individual choices. Anti-coercion revote window lets voters change their choice until deadline; coercers can never verify what you voted. FHE.allowPublic(tally) after the vote window triggers threshold decryption of the aggregate result only. Voting weight tied to $OBS balance earned via ObscuraPay.",
  },
  {
    wave: 3,
    name: "ObscuraVault",
    category: "MEV-Protected DeFi",
    fheOps: ["gt", "gte", "select", "add", "sub"],
    description: "Sealed-bid auction protocol and MEV-protected yield vault. Users deposit ETH and receive hidden $OBS yield positions. Bids are encrypted — FHE.gt() selects the winner without revealing any losing bid. FHE.select() routes tokens to the winner only. Zero front-running, zero MEV extraction. Vault positions feed governance weight in ObscuraVote.",
  },
  {
    wave: 4,
    name: "ObscuraTrust",
    category: "Selective Disclosure & Compliance",
    fheOps: ["eq", "gte", "allow", "allowTransient"],
    description: "Encrypted identity and institutional compliance layer. Identity attributes stored as ebool and euint8 ciphertexts — FHE.gte() validates compliance thresholds without revealing the underlying data. Selective disclosure via FHE.allow(data, auditorAddress) cryptographically scopes regulatory access. Time-scoped audit signatures for regulators with zero persistent exposure.",
  },
  {
    wave: 5,
    name: "ObscuraMind",
    category: "Privacy-Preserving AI Inference",
    fheOps: ["mul", "add", "div", "gte", "select", "square"],
    description: "On-chain ML inference on fully encrypted data. Pre-trained model weights as euint64 — FHE.mul() computes weighted dot products, FHE.add() aggregates, FHE.div() normalizes. Cross-module inference pulls from Pay (salary history), Vault (positions), and Vote (governance activity). Outputs an encrypted credit score that feeds under-collateralized lending in ObscuraVault.",
  },
];

const fheOps = [
  { op: "FHE.asEuint64()", desc: "Convert encrypted InEuint64 client input to on-chain handle", wave1: true, waves: [1, 2, 3, 4, 5] },
  { op: "FHE.asEaddress()", desc: "Encrypt an Ethereum address for private on-chain storage", wave1: true, waves: [1] },
  { op: "FHE.asEbool()", desc: "Encrypt a boolean value for conditional FHE logic", wave1: true, waves: [1, 3, 4] },
  { op: "FHE.add()", desc: "Homomorphic addition — accumulate encrypted values without revealing them", wave1: true, waves: [1, 2, 3, 5] },
  { op: "FHE.sub()", desc: "Homomorphic subtraction — deduct encrypted amounts", wave1: true, waves: [1, 3] },
  { op: "FHE.mul()", desc: "Multiply encrypted values — weighted ML feature computation", wave1: false, waves: [5] },
  { op: "FHE.div()", desc: "Divide encrypted values — normalize credit scores", wave1: false, waves: [5] },
  { op: "FHE.eq()", desc: "Equality check on ciphertext — encrypted identity matching", wave1: true, waves: [1, 4] },
  { op: "FHE.gte()", desc: "Greater-than-or-equal on ciphertext — escrow funded check", wave1: true, waves: [1, 3, 4, 5] },
  { op: "FHE.gt()", desc: "Greater-than comparison — sealed-bid auction winner selection", wave1: false, waves: [3] },
  { op: "FHE.select()", desc: "Encrypted conditional: if ebool then a else b — silent failure", wave1: true, waves: [1, 3, 5] },
  { op: "FHE.and()", desc: "Logical AND on encrypted booleans — combine auth conditions", wave1: true, waves: [1] },
  { op: "FHE.not()", desc: "Logical NOT on encrypted boolean — invert condition", wave1: true, waves: [1] },
  { op: "FHE.allow()", desc: "Grant specific address decrypt access to a handle", wave1: true, waves: [1, 2, 4] },
  { op: "FHE.allowThis()", desc: "Contract retains access for future transaction usage", wave1: true, waves: [1] },
  { op: "FHE.allowPublic()", desc: "Make handle decryptable by anyone — irreversible", wave1: false, waves: [2] },
  { op: "FHE.allowTransient()", desc: "Temporary access scoped to current transaction only", wave1: false, waves: [4] },
  { op: "FHE.isInitialized()", desc: "Check whether an encrypted handle exists and is set", wave1: true, waves: [1] },
  { op: "FHE.square()", desc: "Square an encrypted value — polynomial ML features", wave1: false, waves: [5] },
];

const resources = [
  { title: "Fhenix CoFHE Docs", url: "https://cofhe-docs.fhenix.zone", purpose: "Official protocol documentation" },
  { title: "Quick Start Guide", url: "https://cofhe-docs.fhenix.zone/fhe-library/introduction/quick-start", purpose: "Project setup & first contract" },
  { title: "Access Control (ACL)", url: "https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control", purpose: "FHE.allow() patterns" },
  { title: "Permits Guide", url: "https://cofhe-docs.fhenix.zone/client-sdk/guides/permits", purpose: "EIP-712 decrypt authorization" },
  { title: "FHE.sol Reference", url: "https://cofhe-docs.fhenix.zone/fhe-library/reference/fhe-sol", purpose: "All FHE operations" },
  { title: "FHERC20 Standard", url: "https://cofhe-docs.fhenix.zone/fhe-library/confidential-contracts/fherc20/overview", purpose: "$OBS token standard" },
  { title: "Best Practices", url: "https://cofhe-docs.fhenix.zone/fhe-library/introduction/best-practices", purpose: "Avoid common mistakes" },
  { title: "Common Errors", url: "https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/common-errors", purpose: "Debug ACL and permit bugs" },
  { title: "CoFHE SDK Repo", url: "https://github.com/FhenixProtocol/cofhesdk", purpose: "Client SDK source code" },
  { title: "Arbiscan Sepolia", url: "https://sepolia.arbiscan.io", purpose: "View live OBSCURA transactions" },
];

const DocsPage = () => {
  const [activeSection, setActiveSection] = useState("overview");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <ObscuraNav />

      <div className="pt-24 px-6 pb-16 max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <div className="text-xs tracking-[0.2em] uppercase text-primary mb-4 text-glow-sm">
                ◆ Documentation
              </div>
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md transition-all ${
                    activeSection === s.id
                      ? "text-primary bg-primary/5 border border-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              ))}

              <div className="mt-8 pt-6 border-t border-border/30 space-y-1">
                <div className="text-xs tracking-[0.15em] uppercase text-muted-foreground/40 mb-2">
                  Deployed Contracts · 8 live
                </div>
                {deployedContracts.map((c) => (
                  <a
                    key={c.name}
                    href={c.explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-muted-foreground/50 hover:text-primary transition-colors"
                  >
                    {c.name}
                  </a>
                ))}
                <div className="pt-2 text-[11px] text-muted-foreground/30">
                  Arbitrum Sepolia · 421614
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-20 min-w-0">

            {/* ── OVERVIEW ── */}
            <motion.section id="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="text-xs tracking-[0.2em] uppercase text-primary text-glow-sm">
                ◆ Official Documentation
              </span>
              <h1 className="font-display text-3xl md:text-4xl text-foreground tracking-tight mt-2 mb-4">
                OBSCURA <span className="text-primary text-glow">Protocol</span>
              </h1>
              <p className="text-sm font-body text-muted-foreground leading-relaxed mb-3 max-w-2xl">
                OBSCURA is the dark operating system for onchain organizations — a five-module privacy platform powered by <strong className="text-foreground">Fhenix CoFHE</strong> (Coprocessor Fully Homomorphic Encryption). All arithmetic executes directly on ciphertext. Data never decrypts on-chain. <em>See only what you're meant to.</em>
              </p>
              <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                Waves 1–2 are live on Arbitrum Sepolia with 12+ deployed contracts: encrypted stablecoins (cUSDC), payroll streams to stealth addresses, confidential escrows, payroll insurance, cross-chain USDC bridging, and coercion-resistant governance. Waves 3–5 (Vault, Trust, Mind) extend the stack to MEV-protected DeFi, selective compliance, and privacy-preserving AI inference.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {[
                  {
                    icon: Shield,
                    title: "Privacy-First Architecture",
                    desc: "All sensitive values — salaries, balances, escrow amounts, identities — stored and computed as FHE ciphertexts. Arbiscan shows zero plaintext values.",
                  },
                  {
                    icon: Zap,
                    title: "CoFHE Coprocessor",
                    desc: "FHE computation offloaded to the Fhenix Threshold Network. Contracts issue encrypted ops on-chain; the coprocessor evaluates them and publishes verified results.",
                  },
                  {
                    icon: Lock,
                    title: "EIP-712 Permit-Gated Decryption",
                    desc: "Users sign cryptographic permits to decrypt their own data. Auditors get scoped permits for aggregate views only. No trust — only cryptographic authorization.",
                  },
                ].map((card) => (
                  <div key={card.title} className="glass-panel rounded-md p-5">
                    <card.icon className="w-5 h-5 text-primary mb-3" />
                    <h3 className="font-display text-sm tracking-wider text-foreground mb-1.5">{card.title}</h3>
                    <p className="text-xs font-body text-muted-foreground">{card.desc}</p>
                  </div>
                ))}
              </div>

              <div className="glass-panel rounded-md p-5 border-primary/20">
                <div className="text-xs tracking-[0.2em] uppercase text-primary mb-4">◆ What OBSCURA Proves</div>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-xs font-body text-muted-foreground">
                  <p><span className="text-foreground">FHE on EVM is production-ready.</span> 12+ smart contracts deployed to Arbitrum Sepolia, processing real encrypted transactions with zero plaintext leakage across payments and governance.</p>
                  <p><span className="text-foreground">Complex business logic works on ciphertext.</span> Payroll streams (FHE.add), escrow funding (FHE.gte), stealth addressing (FHE.asEaddress), silent authorization (FHE.select), and encrypted tallies (FHE.allowPublic) — all on encrypted data.</p>
                  <p><span className="text-foreground">UX can abstract FHE complexity.</span> Async stepper, permit-gated decrypt buttons, and the &ldquo;What&rsquo;s Private?&rdquo; panel make encryption tangible. 8-tab PayPage + 5-tab VotePage with zero user exposure to ciphertext internals.</p>
                  <p><span className="text-foreground">Five composable encrypted modules.</span> Pay funds escrows. Insurance protects payroll. Stealth hides recipients. Vote uses encrypted ballots. Vault, Trust, and Mind extend the stack to DeFi, compliance, and AI — all on the same FHE infrastructure.</p>
                </div>
              </div>
            </motion.section>

            {/* ── WAVE 1 ── */}
            <section id="wave1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs tracking-[0.15em] uppercase text-primary text-glow-sm">
                  Live on Arbitrum Sepolia
                </span>
              </div>
              <h2 className="font-display text-2xl text-foreground tracking-tight mb-3">
                ObscuraPay — <span className="text-primary text-glow">Complete Encrypted Payment Platform</span>
              </h2>
              <p className="text-sm font-body text-muted-foreground mb-8 max-w-2xl">
                10+ Solidity contracts and a full-featured React frontend. Send encrypted cUSDC, stream payroll to stealth addresses, create escrows with resolver conditions, buy payroll insurance, bridge cross-chain — all fully encrypted. Arbiscan shows nothing.
              </p>

              <div className="space-y-5">
                {wave1Features.map((section) => (
                  <div key={section.category} className="glass-panel rounded-md overflow-hidden">
                    <div className="p-4 border-b border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="font-display text-sm tracking-wider text-foreground">{section.category}</span>
                      </div>
                      <code className="font-mono text-xs text-muted-foreground/40 bg-secondary/50 px-2 py-0.5 rounded-md">
                        {section.contract}
                      </code>
                    </div>
                    <ul className="p-4 space-y-2">
                      {section.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs font-body text-muted-foreground">
                          <span className="text-primary/60 mt-0.5 flex-shrink-0">›</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-6 glass-panel rounded-md p-5">
                <div className="text-xs tracking-[0.15em] uppercase text-primary mb-4">◆ Frontend — 8-Tab PayPage</div>
                <div className="grid md:grid-cols-4 gap-3">
                  {[
                    { tab: "Dashboard", desc: "cUSDC balance, wrap/unwrap, authorize" },
                    { tab: "Send", desc: "Encrypted P2P cUSDC transfers" },
                    { tab: "Receive", desc: "Stealth setup, incoming streams, balance" },
                    { tab: "Escrows", desc: "Create, fund, redeem with resolvers" },
                    { tab: "Streams", desc: "Payroll streams to stealth addresses" },
                    { tab: "Cross-Chain", desc: "Bridge USDC via Circle CCTP" },
                    { tab: "Insurance", desc: "Buy coverage, file disputes, stake" },
                    { tab: "Stealth", desc: "Register meta-address, scan inbox" },
                  ].map((t) => (
                    <div key={t.tab} className="bg-secondary/20 rounded-md p-3 border border-border/30">
                      <div className="text-xs text-primary mb-1">{t.tab}</div>
                      <div className="text-xs font-body text-muted-foreground">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 glass-panel rounded-md p-5">
                <div className="text-xs tracking-[0.2em] uppercase text-primary mb-4">◆ Tech Stack</div>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    ["Blockchain", "Arbitrum Sepolia · Chain ID 421614"],
                    ["Contracts", "Solidity 0.8.25 · FHE.sol · evmVersion cancun"],
                    ["FHE Protocol", "Fhenix CoFHE · @fhenixprotocol/cofhe-contracts"],
                    ["Frontend", "React 18 · Vite 5 · TypeScript 5"],
                    ["Wallet", "wagmi 3.6.0 · viem 2 · injected + WalletConnect"],
                    ["FHE Client", "@cofhe/sdk 0.4.0 · encrypt inputs, decrypt with permits"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-secondary/20 rounded-md p-3 border border-border/20">
                      <div className="text-xs tracking-[0.15em] uppercase text-muted-foreground/50 mb-1">{label}</div>
                      <div className="text-sm text-foreground">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── WAVE 2 ── */}
            <section id="wave2">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs tracking-[0.15em] uppercase text-primary text-glow-sm">
                  Live on Arbitrum Sepolia
                </span>
              </div>
              <h2 className="font-display text-2xl text-foreground tracking-tight mb-3">
                ObscuraVote — <span className="text-primary text-glow">Coercion-Resistant Encrypted Governance</span>
              </h2>
              <p className="text-sm font-body text-muted-foreground mb-8 max-w-2xl">
                Fully encrypted on-chain voting. Ballots stored as FHE ciphertexts. Tallied via FHE.add() without revealing individual votes. Anti-coercion revoting until deadline. Multi-option polls with encrypted results revealed only after finalization.
              </p>

              <div className="space-y-5">
                <div className="glass-panel rounded-md overflow-hidden">
                  <div className="p-4 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="font-display text-sm tracking-wider text-foreground">ObscuraVote V4</span>
                    </div>
                    <code className="font-mono text-xs text-muted-foreground/40 bg-secondary/50 px-2 py-0.5 rounded-md">
                      ObscuraVote.sol
                    </code>
                  </div>
                  <ul className="p-4 space-y-2">
                    {[
                      "createPoll() — owner defines options, deadline, and metadata. All tally slots initialized as euint64 zeros.",
                      "castVote(pollId, optionIndex, InEuint64 weight) — ballot encrypted client-side, FHE.add() accumulates into tally without revealing choice",
                      "Coercion resistance — voters can re-cast before deadline; previous vote subtracted, new one added. Observer cannot distinguish revote from first vote.",
                      "finalizePoll() — after deadline, admin calls finalize. FHE.allowPublic() reveals aggregate tallies. Individual ballots remain encrypted forever.",
                      "Multi-option support — up to 10 options per poll, each with independent encrypted tally counter",
                      "Token-weighted voting — optional euint64 weight parameter for governance token-based influence",
                      "5-tab VotePage frontend — Create, Active, My Votes, Results, History tabs with full lifecycle UX",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs font-body text-muted-foreground">
                        <span className="text-primary/60 mt-0.5 flex-shrink-0">›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* ── DEPLOYED CONTRACTS ── */}
            <section id="contracts">
              <h2 className="font-display text-2xl text-foreground tracking-tight mb-2">
                Deployed <span className="text-primary text-glow">Contracts</span>
              </h2>
              <p className="text-xs text-muted-foreground mb-6">
                Network: Arbitrum Sepolia (421614) · Deployer:{" "}
                <code className="font-mono text-primary/60">0xf76e6B0920e9332fF4410f6dD53F01722AbC71a3</code>
              </p>

              <div className="space-y-3 mb-8">
                {deployedContracts.map((c) => (
                  <div key={c.name} className="glass-panel rounded-md p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Terminal className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground">{c.name}</span>
                      </div>
                      <code className="font-mono text-sm text-primary/60 block mb-1 break-all">{c.address}</code>
                      <p className="text-sm font-body text-muted-foreground">{c.purpose}</p>
                    </div>
                    <a
                      href={c.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground/40 hover:text-primary transition-colors flex items-center gap-1 flex-shrink-0"
                    >
                      Arbiscan <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {[
                  {
                    name: "ObscuraPay.sol — Key API",
                    code: `function payEmployee(address emp, InEuint64 calldata encSalary) external
// Encrypted salary accumulated via FHE.add() — no plaintext ever on-chain

function batchPay(address[] calldata emps, InEuint64[] calldata salaries) external
// Up to 50 employees in a single transaction

function getMyBalance() external view returns (euint64)
// Employee retrieves their own encrypted balance handle for client-side decryption

function grantAuditAccess(address auditor) external
function getAggregateTotal() external view returns (euint64)
// Auditor can decrypt total payroll only — individual salaries unreachable`,
                  },
                  {
                    name: "ObscuraToken.sol — Key API",
                    code: `function confidentialTransfer(address to, InEuint64 calldata amount) external
// Transfer amount hidden on-chain. Both parties retain decrypt access.

function claimDailyTokens() external
// Free 100 $OBS per wallet per 24 hours. FHE-encrypted on mint.

function setOperator(address operator, uint256 expiry) external
// Time-limited delegation -- operator can transfer on your behalf until expiry

// ACL pattern applied on every balance update:
FHE.allow(encryptedBalances[to], to);         // recipient decrypts their balance
FHE.allow(encryptedBalances[from], from);     // sender decrypts their balance
FHE.allowThis(encryptedBalances[from]);       // contract modifies next tx`,
                  },
                  {
                    name: "ObscuraEscrow.sol — Silent Failure Pattern",
                    code: `function redeemEscrow(uint256 escrowId) external {
    // All authorization checks performed on encrypted data
    eaddress eCaller = FHE.asEaddress(msg.sender);
    ebool isOwner    = FHE.eq(eCaller, esc.owner);        // encrypted eq check
    ebool isPaid     = FHE.gte(esc.paidAmount, esc.amount); // encrypted gte check
    ebool notDone    = FHE.not(esc.isRedeemed);            // encrypted not

    ebool valid      = FHE.and(isOwner, FHE.and(isPaid, notDone));

    euint64 zero     = FHE.asEuint64(uint256(0));
    // Unauthorized caller receives 0 tokens silently — no revert, no info leak
    euint64 amount   = FHE.select(valid, esc.paidAmount, zero);
}`,
                  },
                ].map((contract) => (
                  <div key={contract.name} className="glass-panel rounded-md overflow-hidden">
                    <div className="p-3 border-b border-border/50">
                      <span className="text-sm text-muted-foreground/60">{contract.name}</span>
                    </div>
                    <pre className="p-4 overflow-x-auto bg-background/40"><code className="font-mono font-mono text-sm text-foreground/70 leading-relaxed">{contract.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </section>

            {/* ── FHE ARCHITECTURE ── */}
            <section id="architecture">
              <h2 className="font-display text-2xl text-foreground tracking-tight mb-6">
                FHE <span className="text-primary text-glow">Architecture</span>
              </h2>

              <div className="glass-panel rounded-md p-6 mb-6">
                <div className="text-xs tracking-[0.2em] uppercase text-primary mb-5">◆ Ciphertext Lifecycle</div>
                <div className="space-y-4">
                  {[
                    { step: "01", title: "Client Encrypts", desc: "User calls encryptInputs() in @cofhe/sdk. Produces an InEuint64 struct: { ctHash, securityZone, utype, signature }. Input leaves the browser as ciphertext — plaintext never touches the network." },
                    { step: "02", title: "Contract Receives", desc: "Solidity function accepts InEuint64 calldata. FHE.asEuint64(input) converts it to a euint64 handle (bytes32 internally) pointing to ciphertext in the CoFHE system. The EVM stores only the handle." },
                    { step: "03", title: "On-Chain Computation", desc: "FHE.add(), FHE.gte(), FHE.select() etc. operate on handles and return new handles. Actual arithmetic executes in the Threshold Network coprocessor. No plaintext values appear in EVM state at any point." },
                    { step: "04", title: "ACL Permission", desc: "FHE.allow(handle, user) grants decrypt rights to a specific address. FHE.allowThis(handle) lets the contract use the handle in future transactions. Without explicit ACL entry, no one can decrypt — not even the contract owner." },
                    { step: "05", title: "Threshold Decryption", desc: "User calls decryptForView(ctHash, FheTypes.Uint64).withPermit().execute() via @cofhe/sdk. The Threshold Network verifies the EIP-712 permit, collectively decrypts using multi-party computation, and returns the plaintext to the authorized caller only." },
                  ].map((step) => (
                    <div key={step.step} className="flex gap-4">
                      <span className="text-primary text-xs w-6 flex-shrink-0 pt-0.5">{step.step}</span>
                      <div>
                        <span className="text-xs text-foreground">{step.title}</span>
                        <p className="text-xs font-body text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel rounded-md overflow-hidden">
                <div className="p-4 border-b border-border/50">
                  <span className="text-xs tracking-[0.2em] uppercase text-primary/60 font-mono">◆ Critical ACL Rules</span>
                </div>
                <pre className="p-4 overflow-x-auto bg-background/40"><code className="font-mono font-mono text-sm text-foreground/70 leading-relaxed">{`// Rule 1: Always call allowThis() for values used in future transactions
FHE.allowThis(encryptedBalances[emp]);
// If omitted: next transaction cannot read the handle -- silent reverts

// Rule 2: Grant allow() to every party that needs to decrypt
FHE.allow(encryptedBalances[emp], emp);       // employee decrypts salary
FHE.allow(totalPayroll, auditorAddress);      // auditor sees aggregate only

// Rule 3: Use select() for all conditional logic -- never if/else on ebool
ebool valid = FHE.and(FHE.eq(caller, owner), FHE.gte(paid, amount));
euint64 result = FHE.select(valid, amount, FHE.asEuint64(0));
// Unauthorized callers receive zero silently -- externally identical to success

// Rule 4: Use encodeAbiParameters (NOT encodePacked) for abi.decode-compatible bytes
resolverData = encodeAbiParameters(
  [{ type: "uint8" }, { type: "uint256" }],
  [conditionType, deadlineTimestamp]
// encodePacked produces 33 bytes; abi.decode expects 64 bytes -- causes revert`}</code>
                </pre>
              </div>
            </section>

            {/* ── FHE OPERATIONS ── */}
            <section id="fhe-ops">
              <h2 className="font-display text-2xl text-foreground tracking-tight mb-3">
                FHE <span className="text-primary text-glow">Operations</span>
              </h2>
              <p className="text-xs font-body text-muted-foreground mb-6">
                All FHE operations used across the OBSCURA platform. Highlighted rows are currently active in deployed contracts.
              </p>

              <div className="glass-panel rounded-md overflow-hidden">
                <div className="grid grid-cols-[1.2fr_2.5fr_0.8fr] gap-4 p-3 border-b border-border/50 text-xs tracking-[0.15em] uppercase text-muted-foreground">
                  <span>Operation</span>
                  <span>Description</span>
                  <span>Status</span>
                </div>
                {fheOps.map((op, i) => (
                  <div
                    key={op.op}
                    className={`grid grid-cols-[1.2fr_2.5fr_0.8fr] gap-4 p-3 items-center ${i % 2 === 0 ? "bg-secondary/10" : ""}`}
                  >
                    <span className={`font-mono text-xs ${op.wave1 ? "text-primary" : "text-muted-foreground/60"}`}>{op.op}</span>
                    <span className="text-xs font-body text-muted-foreground">{op.desc}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-md ${op.wave1 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground/40"}`}>
                      {op.wave1 ? "Active" : "Planned"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── ROADMAP ── */}
            <section id="roadmap">
              <h2 className="font-display text-2xl text-foreground tracking-tight mb-3">
                Product <span className="text-primary text-glow">Roadmap</span>
              </h2>
              <p className="text-xs font-body text-muted-foreground mb-8 max-w-2xl">
                Future encrypted modules planned for the OBSCURA platform. Each module deepens the privacy stack and composes with existing functionality.
              </p>

              <div className="space-y-4">
                {/* Wave 1 — live */}
                <div className="glass-panel rounded-md overflow-hidden border-primary/25">
                  <div className="p-4 border-b border-border/50 bg-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">LIVE</span>
                      <span className="font-display text-sm text-foreground tracking-wider">ObscuraPay + ObscuraVote</span>
                      <span className="text-xs text-muted-foreground/50">Payments & Governance</span>
                    </div>
                    <span className="text-xs text-primary text-glow-sm">✓ DEPLOYED</span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-body text-muted-foreground mb-3">
                      10+ contracts deployed · encrypted cUSDC stablecoin · payroll streams to stealth addresses · confidential escrows with resolver hooks · payroll insurance · cross-chain USDC bridge · coercion-resistant governance · all values FHE ciphertexts
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {["asEuint64", "asEaddress", "asEbool", "add", "sub", "eq", "gte", "select", "and", "not", "allow", "allowThis", "isInitialized"].map((op) => (
                        <span key={op} className="text-[11px] text-primary/60 bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded-md">{op}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Waves 2–5 */}
                {roadmapWaves.map((wave) => (
                  <div key={wave.wave} className="glass-panel rounded-md overflow-hidden">
                    <div className="p-4 border-b border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground/40 bg-secondary/50 border border-border/30 px-2 py-0.5 rounded-md">
                          PLANNED
                        </span>
                        <span className="font-display text-sm text-foreground tracking-wider">{wave.name}</span>
                        <span className="text-xs text-muted-foreground/40">{wave.category}</span>
                      </div>
                      <span className="text-xs text-muted-foreground/30">○ Coming Soon</span>
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-body text-muted-foreground mb-3 leading-relaxed">{wave.description}</p>
                      <div className="flex gap-2 flex-wrap">
                        {wave.fheOps.map((op) => (
                          <span key={op} className="text-[11px] text-muted-foreground/40 bg-secondary/20 border border-border/20 px-1.5 py-0.5 rounded-md">{op}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── TROUBLESHOOTING ── */}
            <section id="troubleshooting">
              <h2 className="font-display text-2xl text-foreground tracking-tight mb-6">
                Known Issues <span className="text-primary text-glow">&amp; Fixes</span>
              </h2>

              <div className="space-y-6">
                {/* Issue 1 */}
                <div className="glass-panel rounded-md overflow-hidden">
                  <div className="p-4 border-b border-border/50 bg-amber-500/5 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400/70 flex-shrink-0" />
                    <span className="text-sm text-foreground">MetaMask &ldquo;Network fee: Unavailable&rdquo; on FHE transactions</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground/50 mb-1">Root Cause</div>
                      <p className="text-xs font-body text-muted-foreground">The Arbitrum Sepolia RPC cannot simulate CoFHE coprocessor calls. <code className="font-mono font-mono">eth_estimateGas</code> fails for any transaction touching FHE operations. MetaMask falls back to &ldquo;Unavailable&rdquo; and blocks the transaction.</p>
                    </div>
                    <div>
                      <div className="text-xs tracking-[0.2em] uppercase text-primary/60 mb-2">Fix</div>
                      <pre className="p-4 overflow-x-auto bg-background/40"><code className="font-mono font-mono text-sm text-foreground/70 leading-relaxed">{`// Add explicit gas: bigint to every writeContractAsync call
const feeData = await publicClient.estimateFeesPerGas();
const maxFeePerGas = feeData.maxFeePerGas
  ? (feeData.maxFeePerGas * 130n) / 100n  // 30% buffer
  : undefined;

await writeContractAsync({
  ...args,
  maxFeePerGas,
  gas: 500_000n,  // explicit limit -- bypasses eth_estimateGas failure
});`}</code>
                      </pre>
                    </div>
                    <div>
                      <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground/50 mb-2">Gas Limits Per Operation</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                        {[
                          ["confidentialTransfer", "500_000n"],
                          ["payEmployee", "500_000n"],
                          ["batchPay", "3_000_000n"],
                          ["createEscrow", "1_200_000n"],
                          ["fundEscrow", "600_000n"],
                          ["redeemEscrow", "800_000n"],
                          ["cancelEscrow", "200_000n"],
                          ["mint / claimDaily", "400-500_000n"],
                          ["grantRole / revokeRole", "150_000n"],
                        ].map(([fn, gas]) => (
                          <div key={fn} className="flex justify-between items-center text-xs bg-secondary/20 rounded-md px-2 py-1">
                            <span className="text-muted-foreground">{fn}</span>
                            <span className="text-primary">{gas}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issue 2 */}
                <div className="glass-panel rounded-md overflow-hidden">
                  <div className="p-4 border-b border-border/50 bg-amber-500/5 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400/70 flex-shrink-0" />
                    <span className="text-sm text-foreground">createEscrow with time-lock / approval condition reverts on-chain</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground/50 mb-1">Root Cause</div>
                      <p className="text-xs font-body text-muted-foreground">
                        <code className="font-mono font-mono">encodePacked</code> (viem) is not compatible with Solidity <code className="font-mono font-mono">abi.decode</code>. The resolver expects standard ABI encoding (32 bytes per word = 64 bytes for uint8+uint256). <code className="font-mono font-mono">encodePacked</code> produces 33 bytes (tight-packed). Solidity cannot read a full word at offset 0 and reverts.
                      </p>
                    </div>
                    <div>
                      <div className="text-xs tracking-[0.2em] uppercase text-primary/60 mb-2">Fix</div>
                      <pre className="p-4 overflow-x-auto bg-background/40"><code className="font-mono font-mono text-sm text-foreground/70 leading-relaxed">{`// Wrong -- tight-packed, breaks abi.decode
import { encodePacked } from "viem";
resolverData = encodePacked(["uint8", "uint256"], [conditionType, deadline]);

// Correct -- standard ABI encoding matches abi.decode byte layout
import { encodeAbiParameters } from "viem";
resolverData = encodeAbiParameters(
  [{ type: "uint8" }, { type: "uint256" }],
  [conditionType, deadline]
);
// Rule: use encodeAbiParameters whenever Solidity uses abi.decode(data, ...)`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                {/* General gotchas */}
                <div className="glass-panel rounded-md p-5">
                  <div className="text-xs tracking-[0.2em] uppercase text-primary/60 mb-4">◆ General CoFHE Gotchas</div>
                  <div className="space-y-3">
                    {[
                      ["Forget FHE.allowThis()", "Contract loses handle access on the next transaction. Always call allowThis() on every updated encrypted value."],
                      ["if/else on ebool", "Solidity cannot branch on encrypted booleans. Always use FHE.select(condition, a, b) for conditional logic."],
                      ["Stale cofheClient", "Call cofheClient.connect(publicClient, walletClient) after every wallet connection or switch to keep SDK state in sync."],
                      ["ERR_ABORTED 504 after vite change", "Kill dev server → delete node_modules/.vite → restart → hard-refresh. Required after any optimizeDeps change."],
                      ["euint64 returns hex in JS ABI", "Declare return type as uint256 (not bytes32) in the TypeScript ABI to receive a proper bigint, not a hex string."],
                    ].map(([err, fix]) => (
                      <div key={err} className="flex gap-3 text-xs items-start">
                        <code className="font-mono text-amber-400/60 flex-shrink-0 mt-0.5">{err}</code>
                        <span className="font-body text-muted-foreground">{fix}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── RESOURCES ── */}
            <section id="resources">
              <h2 className="font-display text-2xl text-foreground tracking-tight mb-6">
                Resource <span className="text-primary text-glow">Stack</span>
              </h2>

              <div className="grid md:grid-cols-2 gap-3">
                {resources.map((r, i) => (
                  <motion.a
                    key={r.title}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-panel rounded-md p-4 flex items-center justify-between group hover:border-primary/30 transition-all"
                  >
                    <div>
                      <div className="text-xs text-foreground group-hover:text-primary transition-colors">{r.title}</div>
                      <div className="text-xs text-muted-foreground/50 mt-0.5">{r.purpose}</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </motion.a>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>

      <ObscuraFooter />
    </div>
  );
};

export default DocsPage;

