import {
  NetworkArbitrumOne,
  TokenUSDC,
  TokenETH,
  TokenSAFE,
  WalletMetamask,
  WalletRainbow,
  WalletSafe,
  WalletWalletConnect,
  WalletLedger,
} from "@web3icons/react";
import { ShieldCheck, KeyRound, Lock, Eye, Fingerprint, Binary } from "lucide-react";

/**
 * Concept-aligned ecosystem: only rails that matter to a privacy operating system.
 * - Settlement: Arbitrum
 * - Encrypted compute: Fhenix / Zama / Inco (custom marks — these aren't in @web3icons branded set)
 * - Stable value: USDC, ETH
 * - Wallets / signing surfaces: MetaMask, Safe, WalletConnect, Ledger, Rainbow
 * - Audit & cryptography partners: drawn as custom mono pictograms
 */

type Mark = {
  label: string;
  kind: "brand" | "custom";
  Icon?: React.ComponentType<{ size?: number; variant?: "branded" | "mono" }>;
  Custom?: React.ReactNode;
};

const FHE_GRAD = (id: string, from: string, to: string) => (
  <linearGradient id={id} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
    <stop offset="0" stopColor={from} />
    <stop offset="1" stopColor={to} />
  </linearGradient>
);

const FhenixMark = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <defs>{FHE_GRAD("fh", "#f97316", "#dc2626")}</defs>
    <path d="M12 2 L20 7 V17 L12 22 L4 17 V7 Z" fill="url(#fh)" />
    <path d="M9 8 H15 M9 12 H14 M9 16 H12" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const ZamaMark = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <defs>{FHE_GRAD("zm", "#fbbf24", "#f59e0b")}</defs>
    <rect x="3" y="3" width="18" height="18" rx="5" fill="url(#zm)" />
    <path d="M8 9 L16 9 L8 15 L16 15" stroke="#1f2937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);
const IncoMark = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <defs>{FHE_GRAD("ic", "#22d3ee", "#0e7490")}</defs>
    <circle cx="12" cy="12" r="9" fill="url(#ic)" />
    <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.6" fill="none" />
    <circle cx="12" cy="12" r="1.6" fill="white" />
  </svg>
);
const CoFheMark = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <defs>{FHE_GRAD("co", "#34d399", "#059669")}</defs>
    <path d="M4 6 H20 V18 H4 Z" fill="url(#co)" />
    <path d="M7 10 H10 M7 13 H12 M14 10 H17 M14 13 H17" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const TraitMark = ({ icon, from, to }: { icon: React.ReactNode; from: string; to: string }) => (
  <span
    className="inline-flex size-[26px] items-center justify-center rounded-md text-white"
    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
  >
    {icon}
  </span>
);

const ROW_A: Mark[] = [
  { label: "Fhenix · FHE L2",      kind: "custom", Custom: <FhenixMark /> },
  { label: "Arbitrum · Settlement", kind: "brand",  Icon: NetworkArbitrumOne },
  { label: "Zama · fhEVM",         kind: "custom", Custom: <ZamaMark /> },
  { label: "ocUSDC · Encrypted USDC", kind: "brand", Icon: TokenUSDC },
  { label: "Inco · Confidential compute", kind: "custom", Custom: <IncoMark /> },
  { label: "ocETH · Encrypted ETH", kind: "brand", Icon: TokenETH },
  { label: "CoFHE Coprocessor",    kind: "custom", Custom: <CoFheMark /> },
  { label: "Safe · Multisig",      kind: "brand",  Icon: TokenSAFE },
];

const ROW_B: Mark[] = [
  { label: "MetaMask · Snap",      kind: "brand",  Icon: WalletMetamask },
  { label: "Safe Wallet",          kind: "brand",  Icon: WalletSafe },
  { label: "WalletConnect",        kind: "brand",  Icon: WalletWalletConnect },
  { label: "Ledger · HW signing",  kind: "brand",  Icon: WalletLedger },
  { label: "Rainbow",              kind: "brand",  Icon: WalletRainbow },
  { label: "Trail of Bits · Audit", kind: "custom", Custom: <TraitMark icon={<ShieldCheck className="size-4" />} from="#0f172a" to="#334155" /> },
  { label: "OpenZeppelin · Audit", kind: "custom", Custom: <TraitMark icon={<ShieldCheck className="size-4" />} from="#3b82f6" to="#1e40af" /> },
  { label: "EIP-712 · Permits",    kind: "custom", Custom: <TraitMark icon={<KeyRound className="size-4" />} from="#a78bfa" to="#6d28d9" /> },
  { label: "ZK Proofs",            kind: "custom", Custom: <TraitMark icon={<Binary className="size-4" />} from="#f472b6" to="#be185d" /> },
  { label: "Biometric Permits",    kind: "custom", Custom: <TraitMark icon={<Fingerprint className="size-4" />} from="#fb923c" to="#c2410c" /> },
  { label: "Threshold Decryption", kind: "custom", Custom: <TraitMark icon={<Lock className="size-4" />} from="#34d399" to="#047857" /> },
  { label: "View Permits",         kind: "custom", Custom: <TraitMark icon={<Eye className="size-4" />} from="#22d3ee" to="#0e7490" /> },
];

export function LogoStrip() {
  return (
    <section className="relative border-y border-border-subtle bg-surface overflow-hidden py-20">
      <div className="text-center mb-12 px-6">
        <div className="tag-bracket">▸ The privacy stack</div>
        <h3 className="mt-3 font-display text-3xl md:text-4xl tracking-tight text-foreground">
          One encrypted fabric · woven from the protocols you already trust
        </h3>
        <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
          Obscura unifies FHE coprocessors, audited contracts, and the wallets your team
          already uses — into a single confidential surface for money.
        </p>
      </div>

      <div className="marquee-mask space-y-4 overflow-x-hidden">
        <Marquee>
          {ROW_A.concat(ROW_A).map((item, i) => (
            <LogoChip key={`a-${i}`} {...item} />
          ))}
        </Marquee>
        <Marquee reverse>
          {ROW_B.concat(ROW_B).map((item, i) => (
            <LogoChip key={`b-${i}`} {...item} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}

function Marquee({ children, reverse = false }: { children: React.ReactNode; reverse?: boolean }) {
  return (
    <div className="relative flex overflow-hidden">
      <div
        className={`logo-marquee-track flex w-max shrink-0 gap-3 pr-3 ${
          reverse ? "animate-marquee-reverse" : "animate-marquee"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function LogoChip({ Icon, Custom, label, kind }: Mark) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-elevated px-5 py-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-float)] transition-shadow">
      {kind === "brand" && Icon ? <Icon variant="branded" size={26} /> : Custom}
      <span className="text-sm font-medium text-foreground whitespace-nowrap">{label}</span>
    </div>
  );
}
