import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Banknote,
  Vote,
  Landmark,
} from "lucide-react";
import { useAccount } from "wagmi";
import SpadeLandingNav from "@/components/landing/spade/SpadeLandingNav";
import SpadeFooter from "@/components/landing/spade/SpadeFooter";
import ObscuraSlogan from "@/components/brand/ObscuraSlogan";
import { DocsPanel } from "@/components/docs/DocsShell";
import { getPermits, removePermit, getFHEClient } from "@/lib/fhe";
import { OBSCURA_PAY_ADDRESS, OBSCURA_VOTE_ADDRESS } from "@/config/contracts";
import { EXPLORER_URL } from "@/lib/constants";
import { toast } from "sonner";

interface PermitInfo {
  contractAddress: string;
  createdAt?: string;
}

const PILLARS = [
  {
    icon: Lock,
    title: "Encrypted by default",
    desc: "Balances, transfers, ballots, and payroll amounts are stored as FHE ciphertexts on Arbitrum. Arbiscan never shows plaintext values.",
  },
  {
    icon: Shield,
    title: "Computed in the open",
    desc: "Contracts run homomorphic ops — add, compare, select — on sealed data. The chain proves settlement without exposing numbers.",
  },
  {
    icon: Key,
    title: "Revealed by permit",
    desc: "You sign EIP-712 view permits to decrypt only what you own. Auditors and delegates receive scoped access — never full ledger dumps.",
  },
];

const LIFECYCLE = [
  {
    step: "01",
    title: "Client encrypts",
    body: "The Obscura app encrypts inputs in your browser via CoFHE SDK before any transaction. Plaintext never hits the RPC.",
  },
  {
    step: "02",
    title: "Chain stores handles",
    body: "Solidity receives InEuint64 / InEaddress handles. The EVM stores references — not decrypted values.",
  },
  {
    step: "03",
    title: "Coprocessor computes",
    body: "FHE.add, FHE.select, and FHE.allowPublic run in the Fhenix threshold network. Results stay ciphertext until permitted.",
  },
  {
    step: "04",
    title: "Permit unlocks view",
    body: "A signed permit authorizes threshold decryption for one viewer. Revoke anytime from the panel below.",
  },
];

const VISIBILITY = [
  { item: "Transaction calldata", public: "Visible", private: "Encrypted inputs only" },
  { item: "Token balances", public: "Hidden", private: "euint64 per wallet" },
  { item: "Transfer amounts", public: "Hidden", private: "Confidential P2P / streams" },
  { item: "Vote choice", public: "Hidden", private: "Aggregate tally after close" },
  { item: "Escrow amounts", public: "Hidden", private: "Silent failure on bad auth" },
  { item: "Stealth recipient", public: "Hidden", private: "Meta-address + view tags" },
];

const MODULES = [
  {
    icon: Banknote,
    name: "ObscuraPay",
    points: [
      "ocUSDC balances and transfer amounts stay sealed",
      "Payroll streams use per-cycle salts and optional jitter",
      "Stealth routing hides recipient wallets in calldata",
    ],
  },
  {
    icon: Vote,
    name: "ObscuraVote",
    points: [
      "Ballots encrypted — only aggregate tallies decrypt after finalization",
      "Revote window resists coercion without revealing prior choice",
      "Treasury spend amounts attached as FHE ciphertext to proposals",
    ],
  },
  {
    icon: Landmark,
    name: "ObscuraCredit",
    points: [
      "Positions and health factors computed on encrypted collateral",
      "Bids and limits hidden until permit-gated reveal",
      "No MEV-visible loan sizes on public mempools",
    ],
  },
];

const ACL_ROWS = [
  {
    data: "Employee balance",
    type: "euint64",
    viewers: "Employee, contract",
    ops: "allow, allowThis, add",
  },
  {
    data: "Aggregate payroll",
    type: "euint64",
    viewers: "Auditor (scoped), contract",
    ops: "allow, grantAuditAccess",
  },
  {
    data: "Vote tally",
    type: "euint64",
    viewers: "Public after finalize",
    ops: "allowPublic, add",
  },
  {
    data: "Escrow owner / amount",
    type: "eaddress / euint64",
    viewers: "Owner, resolver",
    ops: "select, gte, allow",
  },
];

const CONTRACTS = [
  {
    name: "ObscuraPay",
    address: OBSCURA_PAY_ADDRESS,
    fields: [
      "encryptedBalances[addr] → euint64",
      "totalPayroll → euint64 (auditor aggregate)",
      "stream hints → InEaddress (Wave 3)",
    ],
  },
  {
    name: "ObscuraVote",
    address: OBSCURA_VOTE_ADDRESS,
    fields: [
      "optionTallies[i] → euint64",
      "vote weights → encrypted, revocable",
    ],
  },
];

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <Icon className="size-4 text-forest" />
      <h2 className="font-display text-lg text-forest">{children}</h2>
    </div>
  );
}

const PrivacyPage = () => {
  const { isConnected } = useAccount();
  const [permits, setPermits] = useState<PermitInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isConnected && getFHEClient()) {
      loadPermits();
    } else {
      setPermits([]);
    }
  }, [isConnected]);

  const loadPermits = async () => {
    setIsLoading(true);
    try {
      const rawPermits = await getPermits();
      setPermits(
        rawPermits.map((p: { contractAddress?: string; createdAt?: string }) => ({
          contractAddress: p?.contractAddress ?? "Unknown",
          createdAt: p?.createdAt ?? new Date().toISOString(),
        })),
      );
    } catch {
      /* FHE client may not be initialized */
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (contractAddress: string) => {
    try {
      await removePermit(contractAddress);
      setPermits((prev) => prev.filter((p) => p.contractAddress !== contractAddress));
      toast.success("Permit revoked");
    } catch {
      toast.error("Failed to revoke permit");
    }
  };

  return (
    <div className="landing-spade docs-page min-h-screen bg-sage-1">
      <SpadeLandingNav />

      <div className="mx-auto max-w-[900px] px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-forest/45">
            ▸ Privacy model
          </p>
          <ObscuraSlogan size="page" className="mt-4" />
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-forest/60">
            Obscura keeps sensitive values encrypted onchain while still settling on public
            chains. You control what decrypts — through cryptographic permits, not trust.
          </p>
          <Link
            to="/pay"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-sage-1 transition-opacity hover:opacity-90"
          >
            Launch app
          </Link>
        </motion.header>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid gap-4 md:grid-cols-3"
          >
            {PILLARS.map((p) => (
              <DocsPanel key={p.title} className="p-5">
                <p.icon className="mb-3 size-5 text-forest" />
                <h3 className="font-display text-base text-forest">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-forest/55">{p.desc}</p>
              </DocsPanel>
            ))}
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <DocsPanel className="p-6 md:p-8">
              <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-forest/45">
                ▸ Ciphertext lifecycle
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                {LIFECYCLE.map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <span className="font-mono text-xs text-lime-accent/90">{item.step}</span>
                    <div>
                      <p className="font-display text-base text-forest">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-forest/55">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DocsPanel>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <DocsPanel className="overflow-hidden p-0">
              <div className="border-b border-forest/10 px-5 py-4">
                <SectionTitle icon={EyeOff}>Onchain visibility</SectionTitle>
                <p className="text-sm text-forest/55">
                  What explorers show versus what Obscura seals by default.
                </p>
              </div>
              <div className="divide-y divide-forest/8">
                {VISIBILITY.map((row) => (
                  <div
                    key={row.item}
                    className="grid grid-cols-[1fr_1fr_1.2fr] gap-3 px-5 py-3 text-xs sm:text-sm"
                  >
                    <span className="font-medium text-forest">{row.item}</span>
                    <span className="font-mono text-forest/40">{row.public}</span>
                    <span className="font-mono text-forest/70">{row.private}</span>
                  </div>
                ))}
              </div>
            </DocsPanel>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-forest/45">
              ▸ By module
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {MODULES.map((mod) => (
                <DocsPanel key={mod.name} className="p-5">
                  <mod.icon className="mb-3 size-5 text-forest" />
                  <h3 className="font-display text-base text-forest">{mod.name}</h3>
                  <ul className="mt-3 space-y-2">
                    {mod.points.map((pt) => (
                      <li
                        key={pt}
                        className="flex gap-2 text-sm leading-snug text-forest/55"
                      >
                        <span className="text-lime-accent">›</span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </DocsPanel>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <DocsPanel className="p-6">
              <SectionTitle icon={Key}>Your active permits</SectionTitle>
              <p className="mb-4 text-sm text-forest/55">
                EIP-712 permits bind decryption to your wallet. The sealing private key never
                leaves the browser.
              </p>

              {!isConnected ? (
                <div className="rounded-lg border border-dashed border-forest/15 bg-sage-2/80 px-4 py-8 text-center">
                  <Eye className="mx-auto mb-2 size-5 text-forest/35" />
                  <p className="text-sm text-forest/50">Connect your wallet to view permits</p>
                </div>
              ) : isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-sage-2" />
                  ))}
                </div>
              ) : permits.length === 0 ? (
                <p className="rounded-lg bg-sage-2 px-4 py-6 text-center font-mono text-xs text-forest/45">
                  No active permits. Signing a decrypt action in Pay or Vote creates one.
                </p>
              ) : (
                <div className="space-y-2">
                  {permits.map((permit, i) => (
                    <div
                      key={`${permit.contractAddress}-${i}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-forest/10 bg-sage-1 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-forest">
                          {permit.contractAddress}
                        </p>
                        <p className="font-mono text-[10px] text-forest/40">
                          EIP-712 self-permit · sealing keypair
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevoke(permit.contractAddress)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-red-300/60 px-3 py-1.5 font-mono text-[10px] text-red-700 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="size-3" />
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </DocsPanel>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <DocsPanel className="p-6">
              <SectionTitle icon={Shield}>Contracts & ACL</SectionTitle>

              <div className="space-y-4">
                {CONTRACTS.map((c) => (
                  <div
                    key={c.name}
                    className="rounded-lg border border-forest/10 bg-sage-1 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-medium text-forest">
                        {c.name}
                      </span>
                      {c.address && (
                        <a
                          href={`${EXPLORER_URL}/address/${c.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-forest/55 hover:text-forest"
                        >
                          Arbiscan
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                    <p className="mb-3 break-all font-mono text-[10px] text-forest/40">
                      {c.address ?? "Not configured"}
                    </p>
                    <ul className="space-y-1.5">
                      {c.fields.map((f) => (
                        <li
                          key={f}
                          className="flex gap-2 font-mono text-[10px] text-forest/60"
                        >
                          <span className="text-lime-accent">•</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-6 overflow-x-auto rounded-lg border border-forest/10">
                <table className="w-full min-w-[520px] text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-forest/10 bg-sage-2 font-mono uppercase tracking-wider text-forest/45">
                      <th className="px-4 py-2.5">Data</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Who can decrypt</th>
                      <th className="px-4 py-2.5">FHE ops</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest/8 font-mono text-forest/65">
                    {ACL_ROWS.map((row) => (
                      <tr key={row.data} className="bg-white">
                        <td className="px-4 py-2.5 text-forest">{row.data}</td>
                        <td className="px-4 py-2.5">{row.type}</td>
                        <td className="px-4 py-2.5">{row.viewers}</td>
                        <td className="px-4 py-2.5">{row.ops}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-lg border border-lime-accent/25 bg-lime-accent/8 px-4 py-3">
                <p className="font-mono text-[11px] leading-relaxed text-forest/70">
                  <span className="font-medium text-forest">Permit flow:</span> public sealing
                  key goes to CoFHE for re-encryption; private key stays local. Only the permit
                  holder can unseal — even Obscura cannot read your ciphertext without your
                  signature.
                </p>
              </div>
            </DocsPanel>
          </motion.section>

          <p className="text-center text-sm text-forest/45">
            Need implementation detail?{" "}
            <Link to="/docs" className="font-medium text-forest underline-offset-2 hover:underline">
              Read the docs
            </Link>
          </p>
        </div>
      </div>

      <SpadeFooter />
    </div>
  );
};

export default PrivacyPage;
