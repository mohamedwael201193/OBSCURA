/**
 * SetupSheet — single bottom-sheet onboarding for new users.
 *
 * Collapses the setup flow into one sheet:
 *  Step 1: Claim test funds (faucet: ocUSDC + ocWETH + ocOBS in one tx)
 *  Step 2: Approve Router as operator on ocUSDC (7-day expiry)
 *  Step 3: Collateral amount → Borrow amount → Confirm (Router.setupAndBorrow)
 *
 * Privacy rules:
 *  - FHE encryption is shown via the 5-step stepper
 *  - No auto-decrypt
 *  - Amounts are encrypted before being sent to the contract
 *
 * The stealth disburse toggle wires Router.setupAndBorrowStealth instead.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, usePublicClient, useWriteContract, useReadContract } from "wagmi";
import {
  X,
  Droplet,
  ShieldCheck,
  ArrowDownToLine,
  ChevronRight,
  Check,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import FHEStepper from "@/components/shared/FHEStepper";
import { useFHEStatus } from "@/hooks/useFHEStatus";
import { FHEStepStatus } from "@/lib/constants";
import { encryptAmount, initFHEClient } from "@/lib/fhe";
import { estimateCappedFees } from "@/lib/gas";
import { awaitCoFHESettle } from "@/lib/cofheSettle";
import {
  CREDIT_ROUTER_ADDRESS,
  CREDIT_MARKET_V316_ADDRESS,
  CREDIT_OCUSDC_ADDRESS,
  CONFIDENTIAL_WETH_ADDRESS,
  CONFIDENTIAL_OBS_ADDRESS,
  CONFIDENTIAL_TOKEN_ABI,
  CREDIT_ROUTER_ABI,
  CREDIT_GAS_CAPS,
} from "@/config/credit";
import type { CreditMarketMeta } from "@/config/credit";
import { useIsOperator } from "@/hooks/useIsOperator";

const OPERATOR_EXPIRY_DAYS = 7;
const OPERATOR_EXPIRY_SEC  = OPERATOR_EXPIRY_DAYS * 24 * 60 * 60;

interface SetupSheetProps {
  open: boolean;
  onClose: () => void;
  /** Primary market to set up borrow in */
  market?: CreditMarketMeta;
  onSuccess?: () => void;
}

type SetupStep = "faucet" | "operator" | "borrow" | "done";

export default function SetupSheet({ open, onClose, market, onSuccess }: SetupSheetProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const fhe = useFHEStatus();

  const [step, setStep] = useState<SetupStep>("faucet");
  const [collateralAmt, setCollateralAmt] = useState("");
  const [borrowAmt, setBorrowAmt]         = useState("");
  const [stealthToggle, setStealthToggle] = useState(false);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  const marketAddr = market?.address ?? CREDIT_MARKET_V316_ADDRESS;
  const routerAddr = CREDIT_ROUTER_ADDRESS;

  // Check operator approval status
  const { checkOperator } = useIsOperator();

  // Claim faucet for all 3 tokens — skips tokens still on cooldown
  const handleFaucet = useCallback(async () => {
    if (!address || !publicClient) return;
    setBusy(true);
    setError(null);
    fhe.setStep(FHEStepStatus.SENDING);
    try {
      const tokens: (`0x${string}` | undefined)[] = [
        CREDIT_OCUSDC_ADDRESS,
        CONFIDENTIAL_WETH_ADDRESS,
        CONFIDENTIAL_OBS_ADDRESS,
      ].filter(Boolean);

      // Batch all cooldown reads into a single multicall — avoids rate limiting
      const cooldowns = await publicClient.multicall({
        contracts: tokens.map((addr) => ({
          abi: CONFIDENTIAL_TOKEN_ABI,
          address: addr as `0x${string}`,
          functionName: "nextFaucetIn" as const,
          args: [address] as [`0x${string}`],
        })),
        allowFailure: true,
      });

      const claimable = tokens.filter(
        (_, i) => cooldowns[i].status === "success" && (cooldowns[i].result as bigint) === 0n
      );

      let claimed = 0;
      const fees = await estimateCappedFees(publicClient);
      for (const tokenAddr of claimable) {
        if (!tokenAddr) continue;
        const hash = await writeContractAsync({
          abi: CONFIDENTIAL_TOKEN_ABI,
          address: tokenAddr,
          functionName: "claimFaucet",
          ...fees,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        claimed++;
        // Brief pause between sequential writes to avoid RPC rate limiting
        if (claimed < claimable.length) await new Promise((r) => setTimeout(r, 500));
      }

      if (claimed === 0) {
        setError("All tokens are still on 24h cooldown. You can skip to the next step.");
        fhe.setStep(FHEStepStatus.IDLE);
        return;
      }

      fhe.setStep(FHEStepStatus.READY);
      setStep("operator");
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? "Faucet claim failed");
      fhe.setStep(FHEStepStatus.IDLE);
    } finally {
      setBusy(false);
    }
  }, [address, publicClient, writeContractAsync, fhe]);

  // Approve Router as operator on ocUSDC (7-day expiry)
  const handleOperator = useCallback(async () => {
    if (!address || !publicClient || !routerAddr) return;
    setBusy(true);
    setError(null);
    fhe.setStep(FHEStepStatus.SENDING);
    try {
      const until = Math.floor(Date.now() / 1000) + OPERATOR_EXPIRY_SEC;
      const fees = await estimateCappedFees(publicClient);

      // Approve on loan token (ocUSDC) — needed for repay path
      if (CREDIT_OCUSDC_ADDRESS) {
        const h1 = await writeContractAsync({
          abi: CONFIDENTIAL_TOKEN_ABI,
          address: CREDIT_OCUSDC_ADDRESS,
          functionName: "setOperator",
          args: [routerAddr, BigInt(until)],
          ...fees,
        });
        await publicClient.waitForTransactionReceipt({ hash: h1 });
      }

      fhe.setStep(FHEStepStatus.READY);
      setStep("borrow");
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? "Operator approval failed");
      fhe.setStep(FHEStepStatus.IDLE);
    } finally {
      setBusy(false);
    }
  }, [address, publicClient, writeContractAsync, routerAddr, fhe]);

  // setupAndBorrow via Router (single tx)
  const handleSetup = useCallback(async () => {
    if (!address || !publicClient || !routerAddr || !marketAddr) return;
    const collPlain = BigInt(Math.round(parseFloat(collateralAmt || "0") * 1e6));
    const borrPlain = BigInt(Math.round(parseFloat(borrowAmt || "0") * 1e6));
    if (!collPlain || !borrPlain) { setError("Enter collateral and borrow amounts"); return; }

    setBusy(true);
    setError(null);
    fhe.setStep(FHEStepStatus.ENCRYPTING);

    try {
      const fheClient = await initFHEClient();

      // Encrypt collateral push (transfer to market)
      const encCollPush   = await encryptAmount(fheClient, collPlain);
      // Encrypt collateral for market (supplyCollateralFor)
      const encCollMarket = await encryptAmount(fheClient, collPlain);
      // Encrypt borrow
      const encBorrow     = await encryptAmount(fheClient, borrPlain);

      fhe.setStep(FHEStepStatus.COMPUTING);

      const fees = await estimateCappedFees(publicClient);
      fhe.setStep(FHEStepStatus.SENDING);

      const routerAbi = CREDIT_ROUTER_ABI as any;

      if (stealthToggle) {
        // Announce a stealth address (derive from user key; simplified here to use same address + random metadata)
        const hash = await writeContractAsync({
          abi: routerAbi,
          address: routerAddr,
          functionName: "setupAndBorrowStealth",
          args: [
            marketAddr,
            collPlain,
            encCollPush,
            encCollMarket,
            borrPlain,
            encBorrow,
            address, // stealthAddress = self for testnet (eaddress not supported)
            "0x",    // ephemeralPubKey placeholder
            "0x00",  // viewTag placeholder
            "0x",    // metadata placeholder
          ],
          gas: CREDIT_GAS_CAPS.borrow * 2n,
          ...fees,
        });
        fhe.setStep(FHEStepStatus.SETTLING);
        await awaitCoFHESettle(publicClient, hash);
      } else {
        const hash = await writeContractAsync({
          abi: routerAbi,
          address: routerAddr,
          functionName: "setupAndBorrow",
          args: [
            marketAddr,
            0n,          // shieldAmt = 0 (pre-shielded)
            collPlain,
            encCollPush,
            encCollMarket,
            borrPlain,
            encBorrow,
          ],
          gas: CREDIT_GAS_CAPS.borrow * 2n,
          ...fees,
        });
        fhe.setStep(FHEStepStatus.SETTLING);
        await awaitCoFHESettle(publicClient, hash);
      }

      fhe.setStep(FHEStepStatus.READY);
      setStep("done");
      onSuccess?.();
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? "Setup failed");
      fhe.setStep(FHEStepStatus.IDLE);
    } finally {
      setBusy(false);
    }
  }, [address, publicClient, writeContractAsync, routerAddr, marketAddr, collateralAmt, borrowAmt, stealthToggle, fhe, onSuccess]);

  const steps: { key: SetupStep; label: string; icon: React.ReactNode }[] = [
    { key: "faucet",   label: "Get test funds", icon: <Droplet className="w-4 h-4" /> },
    { key: "operator", label: "Approve Router",  icon: <ShieldCheck className="w-4 h-4" /> },
    { key: "borrow",   label: "Borrow now",      icon: <ArrowDownToLine className="w-4 h-4" /> },
  ];
  const stepIdx = step === "done" ? 3 : steps.findIndex((s) => s.key === step);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border border-white/10 bg-[#0c0f14] shadow-2xl"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Handle + close */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="w-8 h-1 rounded-full bg-white/20 mx-auto absolute left-0 right-0 top-2" />
              <span className="text-sm font-medium text-white/90">Get started with Obscura Credit</span>
              <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="px-5 py-3 flex items-center gap-0">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-0 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                    i < stepIdx ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300" :
                    i === stepIdx ? "bg-violet-500/20 border-violet-500/60 text-violet-300" :
                    "bg-white/[0.03] border-white/15 text-white/30"
                  }`}>
                    {i < stepIdx ? <Check className="w-3.5 h-3.5" /> : s.icon}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-1 ${i < stepIdx ? "bg-emerald-500/40" : "bg-white/10"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step content */}
            <div className="px-5 py-4 pb-8 max-h-[70vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === "faucet" && (
                  <motion.div key="faucet" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <p className="text-sm text-white/70 mb-4">
                      Claim 10,000 ocUSDC + 1 ocWETH + 1,000 ocOBS to your wallet — needed for collateral and repayment.
                    </p>
                    <p className="text-[10px] text-white/40 mb-5 font-mono">3 txs · one per token · 24h cooldown</p>
                    <button
                      disabled={busy || !address}
                      onClick={handleFaucet}
                      className="w-full py-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Droplet className="w-4 h-4" />}
                      Claim test funds
                    </button>
                    <button
                      onClick={() => setStep("operator")}
                      className="w-full mt-2 py-2 text-[11px] text-white/40 hover:text-white/70 transition-colors"
                    >
                      Skip (already claimed) →
                    </button>
                  </motion.div>
                )}

                {step === "operator" && (
                  <motion.div key="operator" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <p className="text-sm text-white/70 mb-3">
                      Allow the Router to move your encrypted funds on your behalf. This is a {OPERATOR_EXPIRY_DAYS}-day approval — like a Uniswap permit.
                    </p>
                    <p className="text-[10px] text-white/40 mb-5 font-mono">1 tx · expires in {OPERATOR_EXPIRY_DAYS} days · revocable anytime</p>
                    <button
                      disabled={busy || !address}
                      onClick={handleOperator}
                      className="w-full py-3 rounded-xl border border-violet-500/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Approve Router ({OPERATOR_EXPIRY_DAYS}d)
                    </button>
                    <button
                      onClick={() => setStep("borrow")}
                      className="w-full mt-2 py-2 text-[11px] text-white/40 hover:text-white/70 transition-colors"
                    >
                      Skip (already approved) →
                    </button>
                  </motion.div>
                )}

                {step === "borrow" && (
                  <motion.div key="borrow" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="mb-4 space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-mono">
                          Collateral (ocUSDC)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={collateralAmt}
                          onChange={(e) => setCollateralAmt(e.target.value)}
                          placeholder="e.g. 1000"
                          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/40"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-mono">
                          Borrow amount (ocUSDC)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={borrowAmt}
                          onChange={(e) => setBorrowAmt(e.target.value)}
                          placeholder="e.g. 500"
                          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/40"
                        />
                      </div>

                      {/* Stealth toggle */}
                      <label className="flex items-center gap-3 cursor-pointer py-1">
                        <div
                          onClick={() => setStealthToggle((v) => !v)}
                          className={`w-9 h-5 rounded-full transition-colors border relative ${stealthToggle ? "bg-violet-600/70 border-violet-500/50" : "bg-white/[0.06] border-white/15"}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${stealthToggle ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                        <div>
                          <span className="text-[11px] text-white/70">Disburse to private address</span>
                          <p className="text-[9px] text-white/35 mt-0.5">
                            Announces borrow via stealth registry (testnet: funds go to your wallet)
                          </p>
                        </div>
                      </label>
                    </div>

                    <button
                      disabled={busy || !collateralAmt || !borrowAmt}
                      onClick={handleSetup}
                      className="w-full py-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
                      Borrow now
                    </button>

                    <FHEStepper status={fhe.status} error={fhe.error ?? undefined} className="mt-3" />
                  </motion.div>
                )}

                {step === "done" && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-base font-medium text-white/90 mb-1">Position opened!</h3>
                    <p className="text-[11px] text-white/50">
                      Your borrow amount is encrypted on-chain. View your position on the Position tab.
                    </p>
                    <button onClick={onClose} className="mt-5 px-5 py-2 rounded-lg border border-white/15 text-sm text-white/70 hover:text-white/90">
                      Done
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <p className="mt-3 text-[10.5px] text-rose-300/80 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
