import { useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { encodeFunctionData, formatUnits, isAddress, parseUnits, type Address, type Hex } from "viem";
import { AlertTriangle, ArrowRight, CheckCircle2, Copy, Fingerprint, Loader2, Plus, Trash2, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";

import { ERC20_APPROVE_ABI, USDC_ARB_SEPOLIA } from "@/config/pay";
import { PAYMASTER_ABI, PAYMASTER_ADDRESS } from "@/config/smartAccount";
import { usePaymentMode } from "@/contexts/PaymentModeContext";
import { useReceipts } from "@/hooks/useReceipts";
import { useSmartAccount } from "@/hooks/useSmartAccount";

interface PublicUSDCSendFormProps {
  defaultPanel?: "single" | "batch";
}

interface BatchRow {
  id: number;
  recipient: string;
  amount: string;
}

function formatUSDC(value?: bigint | null) {
  if (value === undefined || value === null) return "--";
  return Number(formatUnits(value, 6)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseUSDCInput(value: string) {
  if (!value.trim()) return null;
  try {
    const parsed = parseUnits(value, 6);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function shorten(addr?: string | null) {
  return addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "--";
}

export default function PublicUSDCSendForm({ defaultPanel = "single" }: PublicUSDCSendFormProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const receipts = useReceipts();
  const { setPrivacyMode } = usePaymentMode();
  const { accountAddress, isDeployed, hasPasskey, status, error: smartError, deploy, sendUserOp, sendBatchUserOp } = useSmartAccount();

  const [panel, setPanel] = useState<"single" | "batch">(defaultPanel);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [rows, setRows] = useState<BatchRow[]>([
    { id: 1, recipient: "", amount: "" },
    { id: 2, recipient: "", amount: "" },
  ]);
  const [busy, setBusy] = useState<"setup" | "fund" | "send" | "batch" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successHash, setSuccessHash] = useState<Hex | null>(null);

  const smartAddress = accountAddress as Address | null;
  const smartReady = Boolean(isDeployed && hasPasskey && smartAddress);

  const { data: eoaBalance, refetch: refetchEoaBalance } = useReadContract({
    address: USDC_ARB_SEPOLIA,
    abi: ERC20_APPROVE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: smartBalance, refetch: refetchSmartBalance } = useReadContract({
    address: USDC_ARB_SEPOLIA,
    abi: ERC20_APPROVE_ABI,
    functionName: "balanceOf",
    args: smartAddress ? [smartAddress] : undefined,
    query: { enabled: !!smartAddress },
  });

  const { data: usdcWhitelisted } = useReadContract({
    address: PAYMASTER_ADDRESS || undefined,
    abi: PAYMASTER_ABI,
    functionName: "whitelistedTargets",
    args: [USDC_ARB_SEPOLIA],
    query: { enabled: !!PAYMASTER_ADDRESS },
  });

  const sponsorshipBlocked = !!PAYMASTER_ADDRESS && usdcWhitelisted === false;
  const sponsorshipMissing = !PAYMASTER_ADDRESS;
  const setupLabel = !hasPasskey || !isDeployed ? "Set up passkey account" : "Smart account ready";

  const singleAmount = useMemo(() => parseUSDCInput(amount), [amount]);
  const fundAmountRaw = useMemo(() => parseUSDCInput(fundAmount), [fundAmount]);
  const validBatchRows = useMemo(() => {
    return rows
      .map((row) => ({ ...row, parsed: parseUSDCInput(row.amount) }))
      .filter((row) => isAddress(row.recipient) && row.parsed !== null) as Array<BatchRow & { parsed: bigint }>;
  }, [rows]);

  const refreshBalances = async () => {
    await Promise.all([refetchEoaBalance(), refetchSmartBalance()]);
  };

  const copySmartAddress = async () => {
    if (!smartAddress) return;
    await navigator.clipboard.writeText(smartAddress);
    toast.success("Smart account address copied");
  };

  const handleSetup = async () => {
    setBusy("setup");
    setError(null);
    try {
      await deploy();
      toast.success("Passkey smart account ready");
    } catch (err) {
      setError((err as Error).message || "Smart account setup failed");
    } finally {
      setBusy(null);
    }
  };

  const handleFundSmartAccount = async () => {
    if (!address || !smartAddress || !publicClient || !fundAmountRaw) return;
    setBusy("fund");
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: USDC_ARB_SEPOLIA,
        abi: ERC20_APPROVE_ABI,
        functionName: "transfer",
        args: [smartAddress, fundAmountRaw],
        account: address,
        chain: arbitrumSepolia,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      receipts.add({
        kind: "transfer",
        txHash: hash,
        chainId: arbitrumSepolia.id,
        amount: fundAmount,
        recipientLabel: "Smart account funding",
        meta: { mode: "public-fund", token: "USDC", to: smartAddress },
      });
      setFundAmount("");
      await refreshBalances();
      toast.success("USDC moved to your smart account");
    } catch (err) {
      setError((err as Error).message || "Funding failed");
    } finally {
      setBusy(null);
    }
  };

  const assertPublicReady = () => {
    if (!smartReady || !smartAddress) throw new Error("Set up your passkey smart account first.");
    if (sponsorshipMissing) throw new Error("Paymaster is not configured, so gasless Public Mode is unavailable in this environment.");
    if (sponsorshipBlocked) throw new Error("Public USDC sponsorship is not active yet. Whitelist USDC on the paymaster, then retry.");
  };

  const handlePublicSend = async () => {
    setBusy("send");
    setError(null);
    setSuccessHash(null);
    try {
      assertPublicReady();
      if (!isAddress(recipient)) throw new Error("Enter a valid recipient address.");
      if (!singleAmount) throw new Error("Enter a valid USDC amount.");
      if ((smartBalance ?? 0n) < singleAmount) throw new Error("Your smart account needs more USDC.");

      const callData = encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: "transfer",
        args: [recipient as Address, singleAmount],
      }) as Hex;
      const hash = await sendUserOp(USDC_ARB_SEPOLIA, callData);
      receipts.add({
        kind: "transfer",
        txHash: hash,
        chainId: arbitrumSepolia.id,
        amount,
        recipientLabel: recipient,
        meta: { mode: "public", token: "USDC", from: smartAddress, to: recipient },
      });
      setSuccessHash(hash);
      setRecipient("");
      setAmount("");
      await refreshBalances();
      toast.success("Public USDC sent with passkey");
    } catch (err) {
      setError((err as Error).message || "Public send failed");
    } finally {
      setBusy(null);
    }
  };

  const handleBatchSend = async () => {
    setBusy("batch");
    setError(null);
    setSuccessHash(null);
    try {
      assertPublicReady();
      if (validBatchRows.length === 0) throw new Error("Add at least one valid recipient and amount.");
      if (validBatchRows.length > 16) throw new Error("Batch limit is 16 transfers.");
      const total = validBatchRows.reduce((sum, row) => sum + row.parsed, 0n);
      if ((smartBalance ?? 0n) < total) throw new Error("Your smart account needs more USDC for this batch.");

      const calls = validBatchRows.map((row) => ({
        target: USDC_ARB_SEPOLIA,
        callData: encodeFunctionData({
          abi: ERC20_APPROVE_ABI,
          functionName: "transfer",
          args: [row.recipient as Address, row.parsed],
        }) as Hex,
      }));

      const hash = await sendBatchUserOp(calls);
      receipts.add({
        kind: "transfer",
        txHash: hash,
        chainId: arbitrumSepolia.id,
        amount: formatUnits(total, 6),
        recipientLabel: `${validBatchRows.length} public recipients`,
        meta: { mode: "public-batch", token: "USDC", count: validBatchRows.length },
      });
      setSuccessHash(hash);
      setRows([{ id: Date.now(), recipient: "", amount: "" }]);
      await refreshBalances();
      toast.success(`Sent ${validBatchRows.length} public USDC transfer${validBatchRows.length > 1 ? "s" : ""}`);
    } catch (err) {
      setError((err as Error).message || "Batch send failed");
    } finally {
      setBusy(null);
    }
  };

  const updateRow = (id: number, patch: Partial<BatchRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id: number) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)));
  };

  const addRow = () => {
    if (rows.length >= 16) {
      toast.error("Batch limit is 16 transfers");
      return;
    }
    setRows((prev) => [...prev, { id: Date.now(), recipient: "", amount: "" }]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <Zap className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg text-foreground leading-tight">Send public USDC</h3>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/45">Passkey · Sponsored gas</p>
        </div>
        <button type="button" onClick={() => setPrivacyMode("private")} className="btn-pay btn-pay-ghost btn-pay-sm shrink-0">
          Private Mode
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl hairline bg-card p-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/45">Wallet USDC</div>
          <div className="mt-1 font-mono text-base text-foreground">{formatUSDC(eoaBalance as bigint | undefined)}</div>
        </div>
        <div className="rounded-xl hairline bg-card p-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/45">Smart USDC</div>
          <div className="mt-1 font-mono text-base text-foreground">{formatUSDC(smartBalance as bigint | undefined)}</div>
        </div>
        <div className="rounded-xl hairline bg-card p-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/45">Execution</div>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-foreground">
            <Fingerprint className="h-3.5 w-3.5" /> {smartReady ? "Passkey ready" : "Setup needed"}
          </div>
        </div>
      </div>

      {!smartReady && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 space-y-3">
              <p>Public Mode uses a passkey smart account so Obscura can sponsor supported USDC actions.</p>
              <button type="button" onClick={handleSetup} disabled={busy === "setup"} className="btn-pay btn-pay-primary">
                {busy === "setup" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5" />}
                {setupLabel}
              </button>
              {smartError && <p className="text-[11px] text-destructive">{smartError}</p>}
            </div>
          </div>
        </div>
      )}

      {smartReady && smartAddress && (
        <div className="rounded-xl hairline bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Wallet className="h-4 w-4 text-foreground/65" />
            <span className="text-[12px] text-muted-foreground">Smart account</span>
            <span className="font-mono text-[12px] text-foreground">{shorten(smartAddress)}</span>
            <button type="button" onClick={() => void copySmartAddress()} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted" title="Copy smart account address">
              <Copy className="h-3.5 w-3.5" />
            </button>
            {PAYMASTER_ADDRESS && usdcWhitelisted === true && (
              <span className="ml-auto rounded-full bg-[hsl(var(--success))]/10 px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--success))]">Sponsored</span>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={fundAmount}
              onChange={(event) => setFundAmount(event.target.value)}
              inputMode="decimal"
              placeholder="Amount to move into smart account"
              className="pay-input pay-input-sm font-mono"
            />
            <button type="button" onClick={() => void handleFundSmartAccount()} disabled={!fundAmountRaw || busy === "fund"} className="btn-pay btn-pay-ghost">
              {busy === "fund" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              Fund smart account
            </button>
          </div>
        </div>
      )}

      {(sponsorshipMissing || sponsorshipBlocked) && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-[12px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {sponsorshipMissing
              ? "No paymaster is configured for this environment, so gasless Public Mode is unavailable."
              : "The paymaster has not whitelisted public USDC yet. Public sends are blocked until sponsorship is enabled."}
          </span>
        </div>
      )}

      <div className="flex rounded-xl hairline bg-card p-1">
        <button type="button" onClick={() => setPanel("single")} className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${panel === "single" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>
          Single send
        </button>
        <button type="button" onClick={() => setPanel("batch")} className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${panel === "batch" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>
          Batch send
        </button>
      </div>

      {panel === "single" ? (
        <div className="space-y-3">
          <label className="space-y-1.5 block">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/55">Recipient</span>
            <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="0x recipient address" className="pay-input font-mono" />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/55">Amount (USDC)</span>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="25.00" className="pay-input font-mono" />
          </label>
          <button type="button" onClick={() => void handlePublicSend()} disabled={!singleAmount || busy === "send" || !smartReady || sponsorshipMissing || sponsorshipBlocked} className="btn-pay btn-pay-primary w-full justify-center">
            {busy === "send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Send with passkey
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={row.id} className="grid grid-cols-[auto_1fr_112px_auto] gap-2 items-center">
                <span className="font-mono text-[11px] text-muted-foreground/45">#{index + 1}</span>
                <input value={row.recipient} onChange={(event) => updateRow(row.id, { recipient: event.target.value })} placeholder="0x recipient" className="pay-input pay-input-sm font-mono" />
                <input value={row.amount} onChange={(event) => updateRow(row.id, { amount: event.target.value })} inputMode="decimal" placeholder="USDC" className="pay-input pay-input-sm font-mono text-right" />
                <button type="button" onClick={() => removeRow(row.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive" title="Remove row">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={addRow} className="btn-pay btn-pay-ghost flex-1">
              <Plus className="h-3.5 w-3.5" /> Add row
            </button>
            <button type="button" onClick={() => void handleBatchSend()} disabled={validBatchRows.length === 0 || busy === "batch" || !smartReady || sponsorshipMissing || sponsorshipBlocked} className="btn-pay btn-pay-primary flex-[2] justify-center">
              {busy === "batch" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Send {validBatchRows.length || ""} with passkey
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/55 leading-relaxed">
            Batch sends use one passkey approval and one sponsored UserOp. Each transfer is public USDC from your smart account.
          </p>
        </div>
      )}

      {status !== "idle" && status !== "deployed" && (
        <div className="rounded-xl hairline bg-muted/30 p-3 text-[12px] text-muted-foreground">
          Smart account status: <span className="font-mono text-foreground">{status}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/[0.06] p-3 text-[12px] text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successHash && (
        <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--success))]/25 bg-[hsl(var(--success))]/10 p-3 text-[12px] text-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
          <div>
            <div className="font-medium">Public USDC confirmed</div>
            <a href={`https://sepolia.arbiscan.io/tx/${successHash}`} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-muted-foreground hover:text-foreground">
              {shorten(successHash)}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
