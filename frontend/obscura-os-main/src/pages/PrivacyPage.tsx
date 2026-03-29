import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, Key, FileText, Trash2, ExternalLink, ArrowLeft } from "lucide-react";
import { useAccount } from "wagmi";
import ObscuraNav from "@/components/ObscuraNav";
import ObscuraFooter from "@/components/ObscuraFooter";
import { getPermits, removePermit, getFHEClient } from "@/lib/fhe";
import { OBSCURA_PAY_ADDRESS } from "@/config/contracts";
import { EXPLORER_URL } from "@/lib/constants";
import { toast } from "sonner";

interface PermitInfo {
  contractAddress: string;
  createdAt?: string;
}

const PrivacyPage = () => {
  const { isConnected } = useAccount();
  const [permits, setPermits] = useState<PermitInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isConnected && getFHEClient()) {
      loadPermits();
    }
  }, [isConnected]);

  const loadPermits = async () => {
    setIsLoading(true);
    try {
      const rawPermits = await getPermits();
      setPermits(
        rawPermits.map((p: any) => ({
          contractAddress: p?.contractAddress ?? "Unknown",
          createdAt: p?.createdAt ?? new Date().toISOString(),
        }))
      );
    } catch {
      // FHE client may not be initialized yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (contractAddress: string) => {
    try {
      await removePermit(contractAddress);
      setPermits((prev) =>
        prev.filter((p) => p.contractAddress !== contractAddress)
      );
      toast.success("Permit revoked");
    } catch (err) {
      toast.error("Failed to revoke permit");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ObscuraNav />

      <div className="pt-24 px-6 pb-16 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            to="/pay"
            className="inline-flex items-center gap-2 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Pay
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-mono text-glow-sm">
              Privacy Center
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground tracking-tight">
            Your <span className="text-primary text-glow">Permits</span> & Data
          </h1>
          <p className="text-sm font-body text-muted-foreground mt-2 max-w-lg">
            Manage EIP-712 permits, view which contracts hold your encrypted
            data, and control your decryption access.
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Active Permits */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-sm p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-4 h-4 text-primary" />
              <h2 className="font-display text-sm tracking-wider text-foreground">
                Active EIP-712 Permits
              </h2>
            </div>

            {!isConnected ? (
              <p className="text-sm font-mono text-muted-foreground/60 py-4 text-center">
                Connect your wallet to view permits
              </p>
            ) : isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-secondary/30 rounded-sm animate-pulse"
                  />
                ))}
              </div>
            ) : permits.length === 0 ? (
              <p className="text-sm font-mono text-muted-foreground/60 py-4 text-center">
                No active permits. Permits are created when you decrypt data.
              </p>
            ) : (
              <div className="space-y-2">
                {permits.map((permit, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-sm border border-border/30"
                  >
                    <div>
                      <div className="text-xs font-mono text-foreground">
                        {permit.contractAddress}
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground/50">
                        EIP-712 Self-Permit · Contains sealing keypair
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(permit.contractAddress)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono text-red-400 border border-red-500/20 rounded-sm hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Encrypted Data Contracts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-sm p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="font-display text-sm tracking-wider text-foreground">
                Contracts Holding Encrypted Data
              </h2>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-secondary/30 rounded-sm border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-foreground">
                    ObscuraPay.sol
                  </span>
                  {OBSCURA_PAY_ADDRESS && (
                    <a
                      href={`${EXPLORER_URL}/address/${OBSCURA_PAY_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[9px] font-mono text-primary hover:underline"
                    >
                      View on Arbiscan
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="text-[9px] font-mono text-muted-foreground/60 mb-3">
                  {OBSCURA_PAY_ADDRESS ?? "Not deployed yet"}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[9px] font-mono text-muted-foreground">
                      encryptedBalances[employee] → euint64 (per-employee
                      encrypted salary)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[9px] font-mono text-muted-foreground">
                      totalPayroll → euint64 (aggregate total, auditor-accessible)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ACL Reference */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-sm p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="font-display text-sm tracking-wider text-foreground">
                Access Control List (ACL) Reference
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2 text-muted-foreground/60 tracking-wider">
                      DATA
                    </th>
                    <th className="text-left py-2 text-muted-foreground/60 tracking-wider">
                      TYPE
                    </th>
                    <th className="text-left py-2 text-muted-foreground/60 tracking-wider">
                      WHO CAN DECRYPT
                    </th>
                    <th className="text-left py-2 text-muted-foreground/60 tracking-wider">
                      FHE OPS
                    </th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/20">
                    <td className="py-2 text-foreground/80">
                      Employee Balance
                    </td>
                    <td className="py-2">euint64</td>
                    <td className="py-2">
                      <span className="text-primary">Contract</span>,{" "}
                      <span className="text-primary">Employee</span>
                    </td>
                    <td className="py-2">allow, allowThis</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-2 text-foreground/80">
                      Aggregate Total
                    </td>
                    <td className="py-2">euint64</td>
                    <td className="py-2">
                      <span className="text-primary">Contract</span>,{" "}
                      <span className="text-primary">Auditor</span>
                    </td>
                    <td className="py-2">allow, allowThis</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-foreground/80">Salary Input</td>
                    <td className="py-2">InEuint64</td>
                    <td className="py-2">
                      <span className="text-primary">Contract</span> (
                      asEuint64)
                    </td>
                    <td className="py-2">asEuint64, add</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-secondary/10 rounded-sm border border-border/20">
              <div className="text-[9px] font-mono text-muted-foreground">
                <span className="text-primary">How permits work:</span> An
                EIP-712 permit contains a sealing keypair. The public key is
                sent to the CoFHE network for re-encryption, while the private
                key stays in your browser for unsealing. This ensures only the
                permit holder can view decrypted data.
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <ObscuraFooter />
    </div>
  );
};

export default PrivacyPage;
