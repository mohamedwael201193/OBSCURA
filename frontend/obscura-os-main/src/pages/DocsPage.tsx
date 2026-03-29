import { useState } from "react";
import { motion } from "framer-motion";
import { Book, Code, ExternalLink, Shield, Zap, Lock, FileText, Terminal } from "lucide-react";
import ObscuraNav from "@/components/ObscuraNav";
import ObscuraFooter from "@/components/ObscuraFooter";

const sections = [
  { id: "overview", label: "Overview", icon: Book },
  { id: "contracts", label: "Smart Contracts", icon: Code },
  { id: "fhe-ops", label: "FHE Operations", icon: Lock },
  { id: "resources", label: "Resources", icon: ExternalLink },
];

const resources = [
  { title: "Quick Start", url: "https://cofhe-docs.fhenix.zone/fhe-library/introduction/quick-start", purpose: "Project setup" },
  { title: "Access Control", url: "https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/access-control", purpose: "ACL patterns" },
  { title: "Permits Guide", url: "https://cofhe-docs.fhenix.zone/client-sdk/guides/permits", purpose: "Decrypt authorization" },
  { title: "End-to-End Example", url: "https://cofhe-docs.fhenix.zone/client-sdk/examples/end-to-end", purpose: "Full flow" },
  { title: "FHE.sol Reference", url: "https://cofhe-docs.fhenix.zone/fhe-library/reference/fhe-sol", purpose: "All FHE operations" },
  { title: "FHERC20 Overview", url: "https://cofhe-docs.fhenix.zone/fhe-library/confidential-contracts/fherc20/overview", purpose: "$OBS token" },
  { title: "Best Practices", url: "https://cofhe-docs.fhenix.zone/fhe-library/introduction/best-practices", purpose: "Avoid mistakes" },
  { title: "Common Errors", url: "https://cofhe-docs.fhenix.zone/fhe-library/core-concepts/common-errors", purpose: "Debug ACL bugs" },
  { title: "Privara SDK", url: "https://www.npmjs.com/package/@reineira-os/sdk", purpose: "Payment rails" },
  { title: "CoFHE SDK Repo", url: "https://github.com/FhenixProtocol/cofhesdk", purpose: "Client SDK" },
];

const fheOps = [
  { op: "FHE.asEuint64()", desc: "Convert encrypted input from client", waves: [1, 2, 3, 4, 5] },
  { op: "FHE.add()", desc: "Accumulate values homomorphically", waves: [1, 2, 3, 5] },
  { op: "FHE.sub()", desc: "Subtract encrypted values", waves: [1, 3] },
  { op: "FHE.mul()", desc: "Multiply encrypted values", waves: [5] },
  { op: "FHE.div()", desc: "Divide encrypted values", waves: [5] },
  { op: "FHE.gt()", desc: "Greater-than comparison on ciphertext", waves: [3] },
  { op: "FHE.gte()", desc: "Greater-than-or-equal comparison", waves: [3, 4, 5] },
  { op: "FHE.eq()", desc: "Equality check on ciphertext", waves: [4] },
  { op: "FHE.select()", desc: "Conditional select based on encrypted bool", waves: [3, 5] },
  { op: "FHE.allow()", desc: "Grant address decrypt access to handle", waves: [1, 2, 4] },
  { op: "FHE.allowThis()", desc: "Contract retains access to handle", waves: [1] },
  { op: "FHE.allowPublic()", desc: "Make handle publicly decryptable", waves: [2] },
  { op: "FHE.allowTransient()", desc: "Temporary scoped access", waves: [4] },
  { op: "FHE.square()", desc: "Square an encrypted value", waves: [5] },
  { op: "FHE.isInitialized()", desc: "Check if handle exists", waves: [1] },
];

const DocsPage = () => {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <ObscuraNav />

      <div className="pt-24 px-6 pb-16 max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar nav */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <div className="text-[9px] tracking-[0.2em] uppercase text-primary font-mono mb-4 text-glow-sm">
                ◆ Documentation
              </div>
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSection(s.id);
                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono rounded-sm transition-all ${
                    activeSection === s.id ? "text-primary bg-primary/5 border border-primary/20" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-16">
            {/* Overview */}
            <motion.section id="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-display text-3xl md:text-4xl text-foreground tracking-tight mb-2">
                OBSCURA <span className="text-primary text-glow">Documentation</span>
              </h1>
              <p className="text-sm font-body text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                The Dark Operating System for Onchain Organizations. Five encrypted modules powered by Fhenix CoFHE — from confidential payroll to privacy-preserving AI.
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: Shield, title: "Privacy-First", desc: "All data encrypted using Fully Homomorphic Encryption. Arbiscan shows nothing." },
                  { icon: Zap, title: "CoFHE Powered", desc: "Offloads FHE computation to the coprocessor. Async stepper shows progress." },
                  { icon: FileText, title: "EIP-712 Permits", desc: "Sign-to-decrypt authorization. Cryptographic access control, not trust." },
                ].map((card) => (
                  <div key={card.title} className="glass-panel rounded-sm p-5">
                    <card.icon className="w-5 h-5 text-primary mb-3" />
                    <h3 className="font-display text-sm tracking-wider text-foreground mb-1.5">{card.title}</h3>
                    <p className="text-xs font-body text-muted-foreground">{card.desc}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Smart Contracts */}
            <section id="contracts">
              <h2 className="font-display text-2xl text-foreground tracking-tight mb-6">
                Smart <span className="text-primary text-glow">Contracts</span>
              </h2>

              <div className="space-y-4">
                {[
                  {
                    name: "ObscuraPermissions.sol",
                    desc: "Shared ACL helper reused across all waves. Manages roles and FHE handle permissions.",
                    code: `abstract contract ObscuraPermissions {
    enum Role { NONE, ADMIN, EMPLOYEE, AUDITOR }
    mapping(address => Role) public roles;

    function _grantDecrypt(euint64 _handle, address _who) internal {
        FHE.allow(_handle, _who);
    }
}`
                  },
                  {
                    name: "ObscuraPay.sol",
                    desc: "Encrypted payroll — pay employees with hidden amounts, ACL-gated decryption.",
                    code: `function payEmployee(address _emp, InEuint64 calldata _encSalary) external {
    euint64 salary = FHE.asEuint64(_encSalary);
    encryptedBalances[_emp] = FHE.add(encryptedBalances[_emp], salary);
    FHE.allow(encryptedBalances[_emp], _emp);
    FHE.allowThis(encryptedBalances[_emp]);
}`
                  },
                  {
                    name: "ObscuraToken.sol",
                    desc: "$OBS FHERC20 token with encrypted balances and confidential transfers.",
                    code: `// FHERC20 with encrypted balances
// Confidential transfer: sender balance hidden, receiver balance hidden
// FHE.sub(senderBalance, amount) + FHE.add(receiverBalance, amount)`
                  },
                ].map((contract) => (
                  <div key={contract.name} className="glass-panel rounded-sm overflow-hidden">
                    <div className="p-4 border-b border-border/50 flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-primary" />
                      <span className="font-display text-sm tracking-wider text-foreground">{contract.name}</span>
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-body text-muted-foreground mb-4">{contract.desc}</p>
                      <pre className="bg-background/80 border border-border/30 rounded-sm p-4 overflow-x-auto">
                        <code className="text-[11px] font-mono text-foreground/80 leading-relaxed">{contract.code}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* FHE Operations */}
            <section id="fhe-ops">
              <h2 className="font-display text-2xl text-foreground tracking-tight mb-6">
                FHE <span className="text-primary text-glow">Operations</span>
              </h2>

              <div className="glass-panel rounded-sm overflow-hidden">
                <div className="grid grid-cols-[1fr_2fr_auto] gap-4 p-3 border-b border-border/50 text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-mono">
                  <span>Operation</span>
                  <span>Description</span>
                  <span>Waves</span>
                </div>
                {fheOps.map((op, i) => (
                  <div key={op.op} className={`grid grid-cols-[1fr_2fr_auto] gap-4 p-3 items-center ${i % 2 === 0 ? "bg-secondary/10" : ""}`}>
                    <span className="text-xs font-mono text-primary">{op.op}</span>
                    <span className="text-xs font-body text-muted-foreground">{op.desc}</span>
                    <div className="flex gap-1">
                      {op.waves.map((w) => (
                        <span key={w} className={`text-[8px] font-mono w-5 h-5 flex items-center justify-center rounded-sm ${
                          w === 1 ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground/50"
                        }`}>{w}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Resources */}
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
                    className="glass-panel rounded-sm p-4 flex items-center justify-between group hover:border-primary/30 transition-all"
                  >
                    <div>
                      <div className="text-xs font-mono text-foreground group-hover:text-primary transition-colors">{r.title}</div>
                      <div className="text-[9px] font-mono text-muted-foreground/50 mt-0.5">{r.purpose}</div>
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
