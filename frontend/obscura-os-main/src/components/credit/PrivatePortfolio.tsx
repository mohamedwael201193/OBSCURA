/**
 * PrivatePortfolio — aggregated supply/borrow/collateral across markets.
 *
 * All numbers are HIDDEN by default. The user clicks "Reveal portfolio"
 * once to pop a single decrypt batch (sequential, throttled to avoid
 * MetaMask spam — the cached permit means we only sign once).
 *
 * Auto-hides 30s after reveal.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Wallet, Loader2, Download, Lock } from "lucide-react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { CREDIT_MARKET_ABI, type CreditMarketMeta } from "@/config/credit";
import { initFHEClient, decryptBalance } from "@/lib/fhe";
import { PRIVACY_COPY, HIDDEN_GLYPHS } from "@/lib/privacyCopy";

interface Row {
  market: CreditMarketMeta;
  supply: bigint | null;
  borrow: bigint | null;
  collateral: bigint | null;
}

interface Props {
  markets: CreditMarketMeta[];
}

export default function PrivatePortfolio({ markets }: Props) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setRows(markets.map((m) => ({ market: m, supply: null, borrow: null, collateral: null })));
    setRevealed(false);
  }, [markets]);

  // Auto-hide after 30s
  useEffect(() => {
    if (!revealed) return;
    const id = setTimeout(() => {
      setRevealed(false);
      setRows((prev) => prev.map((r) => ({ ...r, supply: null, borrow: null, collateral: null })));
    }, 30_000);
    return () => clearTimeout(id);
  }, [revealed]);

  const reveal = async () => {
    if (!publicClient || !walletClient || !address) return;
    setRevealing(true); setErr(null);
    try {
      await initFHEClient(publicClient, walletClient);
      const next: Row[] = [];
      for (const m of markets) {
        if (!m.address) { next.push({ market: m, supply: null, borrow: null, collateral: null }); continue; }
        try {
          const [supplyHandle, position] = await Promise.all([
            publicClient.readContract({ address: m.address, abi: CREDIT_MARKET_ABI, functionName: "getEncryptedSupplyShares", args: [address] }) as Promise<`0x${string}`>,
            publicClient.readContract({ address: m.address, abi: CREDIT_MARKET_ABI, functionName: "getPosition", args: [address] }) as Promise<readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`]>,
          ]);
          const decode = async (h: `0x${string}`): Promise<bigint> => {
            const bn = BigInt(h);
            if (bn === 0n) return 0n;
            return decryptBalance(bn);
          };
          const [s, b, c] = await Promise.all([decode(supplyHandle), decode(position[1]), decode(position[2])]);
          next.push({ market: m, supply: s, borrow: b, collateral: c });
        } catch {
          next.push({ market: m, supply: null, borrow: null, collateral: null });
        }
      }
      setRows(next);
      setRevealed(true);
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? "Reveal failed");
    } finally {
      setRevealing(false);
    }
  };

  const totals = useMemo(() => {
    let s = 0n, b = 0n, c = 0n;
    for (const r of rows) {
      if (r.supply !== null) s += r.supply;
      if (r.borrow !== null) b += r.borrow;
      if (r.collateral !== null) c += r.collateral;
    }
    return { supply: s, borrow: b, collateral: c };
  }, [rows]);

  const exportSnapshot = () => {
    if (!revealed) return;
    const snapshot = {
      capturedAt: new Date().toISOString(),
      account: address,
      privacyNotice: "Snapshot of FHE-decrypted balances. Treat as sensitive.",
      markets: rows.map((r) => ({
        market: r.market.label,
        supply: r.supply?.toString() ?? null,
        borrow: r.borrow?.toString() ?? null,
        collateral: r.collateral?.toString() ?? null,
      })),
      totals: {
        supply: totals.supply.toString(),
        borrow: totals.borrow.toString(),
        collateral: totals.collateral.toString(),
      },
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `obscura-portfolio-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const fmt6 = (v: bigint | null): string =>
    v === null ? HIDDEN_GLYPHS : `$${(Number(v) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <div className="rounded-2xl hairline bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9.5px] tracking-[0.22em] uppercase text-violet-400/60 font-mono flex items-center gap-1.5">
            <Wallet className="w-3 h-3" /> Private portfolio
          </div>
          <h3 className="mt-1 text-base text-white/90">Cross-market totals</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {revealed && (
            <button
              onClick={exportSnapshot}
              className="text-[10.5px] inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 text-white/65 hover:text-white"
            >
              <Download className="w-3 h-3" /> Export
            </button>
          )}
          <button
            type="button"
            onClick={() => (revealed ? (setRevealed(false), setRows((r) => r.map((x) => ({ ...x, supply: null, borrow: null, collateral: null })))) : void reveal())}
            disabled={revealing || !address}
            className="text-[10.5px] inline-flex items-center gap-1 px-2 py-1 rounded border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 disabled:opacity-50"
          >
            {revealing ? <Loader2 className="w-3 h-3 animate-spin" /> : revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {revealed ? "Hide all" : "Reveal portfolio"}
          </button>
        </div>
      </div>

      {err && <p className="mt-2 text-[11px] text-rose-300">{err}</p>}

      {!address && (
        <p className="mt-3 text-[11px] text-white/50 inline-flex items-center gap-1.5">
          <Lock className="w-3 h-3" /> Connect wallet to access your private portfolio.
        </p>
      )}

      {address && (
        <>
          {/* Totals strip */}
          <AnimatePresence mode="wait">
            <motion.div
              key={revealed ? "shown" : "hidden"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 grid grid-cols-3 gap-2"
            >
              {[
                { k: "Collateral", v: totals.collateral, c: "text-cyan-300" },
                { k: "Supplied",   v: totals.supply,     c: "text-[hsl(var(--success))]" },
                { k: "Borrowed",   v: totals.borrow,     c: "text-violet-300" },
              ].map((t) => (
                <div key={t.k} className="p-3 rounded-lg bg-black/30 border border-white/8">
                  <div className="text-[9.5px] tracking-[0.18em] uppercase text-white/45 font-mono">{t.k}</div>
                  <div className={`mt-0.5 text-lg font-light tabular-nums ${t.c}`}>{revealed ? fmt6(t.v) : HIDDEN_GLYPHS}</div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Per-market table */}
          <div className="mt-4 rounded-lg border border-white/8 overflow-hidden">
            <div className="px-3 py-2 grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground bg-muted/40">
              <span>Market</span>
              <span className="text-right">Collateral</span>
              <span className="text-right">Supply</span>
              <span className="text-right">Borrow</span>
            </div>
            <ul className="divide-y divide-white/5">
              {rows.map((r) => (
                <li key={r.market.address ?? r.market.label} className="px-3 py-2 grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 text-[11.5px] items-center">
                  <span className="text-white/75 truncate">{r.market.label}</span>
                  <span className="text-right tabular-nums text-cyan-300/85">{fmt6(r.collateral)}</span>
                  <span className="text-right tabular-nums text-[hsl(var(--success))]/85">{fmt6(r.supply)}</span>
                  <span className="text-right tabular-nums text-violet-300/85">{fmt6(r.borrow)}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-3 text-[10.5px] text-white/40">
            {revealed
              ? "Auto-hides after 30s · only your wallet can decrypt these handles"
              : PRIVACY_COPY.hidden}
          </p>
        </>
      )}
    </div>
  );
}
