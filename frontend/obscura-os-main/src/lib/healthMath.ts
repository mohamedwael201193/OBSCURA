/**
 * healthMath — pure-math helpers for the Credit health factor.
 *
 * No FHE, no network. All inputs are plaintext public mirrors so the
 * functions can run inside any UI thread without prompting the wallet.
 */
export interface HealthInputs {
  collateral: bigint;   // public mirror, 6dp
  borrow:     bigint;   // public mirror, 6dp
  lltvBps:    number;   // e.g. 7700 = 77%
}

export interface HealthResult {
  hf: number | null;            // null when no debt
  maxBorrowable: bigint;        // collateral * lltvBps / 10000
  liquidationPrice: number | null; // collat $ value where HF = 1, assumes price=1
  cushionBps: number;           // 0–10000 distance from liquidation
}

export function computeHealth(i: HealthInputs): HealthResult {
  const { collateral, borrow, lltvBps } = i;
  const maxBorrowable = (collateral * BigInt(lltvBps)) / 10000n;
  if (borrow === 0n) {
    return { hf: null, maxBorrowable, liquidationPrice: null, cushionBps: 10000 };
  }
  if (collateral === 0n) {
    return { hf: 0, maxBorrowable: 0n, liquidationPrice: 0, cushionBps: 0 };
  }
  const hf = (Number(collateral) * lltvBps) / 10000 / Number(borrow);
  const cushion = Math.max(0, Math.min(10000, Math.round((1 - 1 / Math.max(hf, 0.0001)) * 10000)));
  return {
    hf,
    maxBorrowable,
    liquidationPrice: 1 / hf,
    cushionBps: cushion,
  };
}

/** Simulate "what-if" — add/remove collateral or debt. */
export function simulateHealth(
  i: HealthInputs,
  deltaCollateral: bigint,
  deltaBorrow: bigint
): HealthResult {
  const collateral = i.collateral + deltaCollateral < 0n ? 0n : i.collateral + deltaCollateral;
  const borrow     = i.borrow + deltaBorrow < 0n ? 0n : i.borrow + deltaBorrow;
  return computeHealth({ ...i, collateral, borrow });
}

/** Time-until-liquidation estimate given a linear borrow-rate (bps/year). */
export function estimateTimeToLiquidation(
  i: HealthInputs,
  borrowAprBps: number
): number | null {
  if (i.borrow === 0n || borrowAprBps <= 0) return null;
  const h = computeHealth(i);
  if (h.hf === null) return null;
  if (h.hf <= 1) return 0;
  // borrow grows at rate r per second; when borrow = collateral*lltv => HF=1
  // borrow * e^(rt) = collateral * lltv/10000
  // t = ln(collateral*lltv/10000 / borrow) / r
  const target = (Number(i.collateral) * i.lltvBps) / 10000;
  const ratio = target / Number(i.borrow);
  if (ratio <= 1) return 0;
  const rPerSec = (borrowAprBps / 10000) / (365 * 24 * 3600);
  return Math.log(ratio) / rPerSec;
}

/**
 * Map an HF number to a stable CSS color for sparklines / dials.
 * Matches the severity buckets in useHealthEngine.severityFromHF.
 */
export function severityColor(hf: number | null | undefined): string {
  if (hf === null || hf === undefined) return "rgb(160,160,180)";
  if (hf >= 1.5)  return "rgb(34,197,94)";   // emerald
  if (hf >= 1.2)  return "rgb(245,158,11)";  // amber
  if (hf >= 1.05) return "rgb(249,115,22)";  // orange
  return "rgb(239,68,68)";                   // red
}

/** Format seconds → "12d 4h" / "3h 12m" / "8m 4s". */
export function formatDuration(sec: number | null): string {
  if (sec === null || sec === Infinity) return "—";
  if (sec <= 0) return "now";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
