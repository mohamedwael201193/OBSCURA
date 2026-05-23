/**
 * Wave 4 Credit — addresses + ABI re-exports.
 *
 * ABIs are imported as JSON (Vite tree-shakes and ships only what the bundle
 * touches). Each address is read from VITE_OBSCURA_CREDIT_*_ADDRESS env so
 * the same bundle can be retargeted between testnets without a rebuild.
 */
import ObscuraCreditFactoryAbi from "@/abis/credit/ObscuraCreditFactory.json";
import ObscuraCreditMarketAbi from "@/abis/credit/ObscuraCreditMarket.json";
import ObscuraCreditVaultAbi from "@/abis/credit/ObscuraCreditVault.json";
import ObscuraCreditAuctionAbi from "@/abis/credit/ObscuraCreditAuction.json";
import ObscuraCreditOracleAbi from "@/abis/credit/ObscuraCreditOracle.json";
import ObscuraCreditIRMAbi from "@/abis/credit/ObscuraCreditIRM.json";
import ObscuraCreditScoreAbi from "@/abis/credit/ObscuraCreditScore.json";
import ObscuraCreditScoreV2Abi from "@/abis/credit/ObscuraCreditScoreV2.json";
import ObscuraCreditStreamHookAbi from "@/abis/credit/ObscuraCreditStreamHook.json";
import ObscuraCreditInsuranceHookAbi from "@/abis/credit/ObscuraCreditInsuranceHook.json";
import ObscuraCreditGovernanceProxyAbi from "@/abis/credit/ObscuraCreditGovernanceProxy.json";
import MockChainlinkFeedAbi from "@/abis/credit/MockChainlinkFeed.json";
import ObscuraConfidentialTokenAbi from "@/abis/credit/ObscuraConfidentialToken.json";
import ObscuraCreditRouterAbi from "@/abis/credit/ObscuraCreditRouter.json";

// ─── Addresses (Arbitrum Sepolia 421614) ─────────────────────────────────
export const CREDIT_FACTORY_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_FACTORY_ADDRESS as `0x${string}` | undefined;
export const CREDIT_ORACLE_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_ORACLE_ADDRESS as `0x${string}` | undefined;
export const CREDIT_IRM_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_IRM_ADDRESS as `0x${string}` | undefined;
export const CREDIT_AUCTION_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_AUCTION_ADDRESS as `0x${string}` | undefined;
/** @deprecated v1 — kept for reference only; use CREDIT_SCORE_V2_ADDRESS in all new code. */
export const CREDIT_SCORE_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_SCORE_ADDRESS as `0x${string}` | undefined;
export const CREDIT_STREAM_HOOK_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_STREAM_HOOK_ADDRESS as `0x${string}` | undefined;
export const CREDIT_INSURANCE_HOOK_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_INSURANCE_HOOK_ADDRESS as `0x${string}` | undefined;
export const CREDIT_GOVERNANCE_PROXY_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_GOVERNANCE_PROXY_ADDRESS as `0x${string}` | undefined;

// Wave-5 active credit score (ScoreV2).
export const CREDIT_SCORE_V2_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_SCORE_V2_ADDRESS as `0x${string}` | undefined;

// v3.16 — wallet-native production: Router + new market/vault.
export const CREDIT_ROUTER_ADDRESS       = import.meta.env.VITE_OBSCURA_CREDIT_ROUTER_ADDRESS       as `0x${string}` | undefined;
export const CREDIT_MARKET_V316_ADDRESS  = import.meta.env.VITE_OBSCURA_CREDIT_MARKET_V316_ADDRESS  as `0x${string}` | undefined;
export const CREDIT_VAULT_V316_ADDRESS   = import.meta.env.VITE_OBSCURA_CREDIT_VAULT_V316_ADDRESS   as `0x${string}` | undefined;

// v2 Production — M-86 / M-70-WETH / M-50-OBS markets + Conservative/Balanced vaults.
export const CREDIT_MARKET_M86_ADDRESS              = import.meta.env.VITE_OBSCURA_CREDIT_MARKET_M86_ADDRESS              as `0x${string}` | undefined;
export const CREDIT_MARKET_M70WETH_ADDRESS          = import.meta.env.VITE_OBSCURA_CREDIT_MARKET_M70WETH_ADDRESS          as `0x${string}` | undefined;
export const CREDIT_MARKET_M50OBS_ADDRESS           = import.meta.env.VITE_OBSCURA_CREDIT_MARKET_M50OBS_ADDRESS           as `0x${string}` | undefined;
export const CREDIT_VAULT_CONSERVATIVE_V2_ADDRESS   = import.meta.env.VITE_OBSCURA_CREDIT_VAULT_CONSERVATIVE_V2_ADDRESS   as `0x${string}` | undefined;
export const CREDIT_VAULT_BALANCED_V2_ADDRESS       = import.meta.env.VITE_OBSCURA_CREDIT_VAULT_BALANCED_V2_ADDRESS       as `0x${string}` | undefined;

// Confidential token addresses — Plan v2 shielded wrappers: ocUSDC / ocWETH / ocOBS.
export const CONFIDENTIAL_USDC_ADDRESS  = import.meta.env.VITE_OBSCURA_CONFIDENTIAL_USDC_ADDRESS  as `0x${string}` | undefined;
export const CONFIDENTIAL_OBS_ADDRESS   = import.meta.env.VITE_OBSCURA_CONFIDENTIAL_OBS_ADDRESS   as `0x${string}` | undefined;
export const CONFIDENTIAL_WETH_ADDRESS  = import.meta.env.VITE_OBSCURA_CONFIDENTIAL_WETH_ADDRESS  as `0x${string}` | undefined;
// CREDIT-ONLY ocUSDC — faucet mode (v3.14), used by the credit market (v316 deployed with this token).
// Distinct from CONFIDENTIAL_USDC_ADDRESS which is the Pay-page wrapper backed by real USDC.
export const CREDIT_OCUSDC_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_OCUSDC_ADDRESS as `0x${string}` | undefined;

// ─── ABIs (re-exported for hooks/components) ─────────────────────────────
// All credit ABI files are plain arrays (synced from artifacts via
// scripts/deployWave4v316.ts + post-deploy ABI sync).
export const CREDIT_FACTORY_ABI          = ObscuraCreditFactoryAbi          as any;
export const CREDIT_MARKET_ABI           = ObscuraCreditMarketAbi           as any;
export const CREDIT_VAULT_ABI            = ObscuraCreditVaultAbi            as any;
export const CREDIT_AUCTION_ABI          = ObscuraCreditAuctionAbi          as any;
export const CREDIT_ORACLE_ABI           = ObscuraCreditOracleAbi           as any;
export const CREDIT_IRM_ABI              = ObscuraCreditIRMAbi              as any;
export const CREDIT_SCORE_ABI            = ObscuraCreditScoreAbi            as any;
export const CREDIT_SCORE_V2_ABI         = ObscuraCreditScoreV2Abi          as any;
export const CREDIT_STREAM_HOOK_ABI      = ObscuraCreditStreamHookAbi       as any;
export const CREDIT_INSURANCE_HOOK_ABI   = ObscuraCreditInsuranceHookAbi    as any;
export const CREDIT_GOVERNANCE_PROXY_ABI = ObscuraCreditGovernanceProxyAbi  as any;
export const MOCK_CHAINLINK_FEED_ABI     = MockChainlinkFeedAbi             as any;
export const CONFIDENTIAL_TOKEN_ABI      = ObscuraConfidentialTokenAbi      as any;
export const CREDIT_ROUTER_ABI           = ObscuraCreditRouterAbi           as any;

// ─── Token registry (used by UI for symbol display + faucet UX) ──────────
export interface CreditTokenMeta {
  address?: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  hasFaucet: boolean;        // true if address is an ObscuraConfidentialToken
  faucetAmountLabel?: string; // human-readable drip per claim
  priceUsd?: number;          // mock public price for UI hints
}

export const CREDIT_TOKENS: Record<string, CreditTokenMeta> = {
  // Plan v2 — shielded wrapper tokens: ocUSDC / ocWETH / ocOBS.
  // Symbols match the factory deploy: symbol="ocUSDC", "ocWETH", "ocOBS".
  ocUSDC: { address: CREDIT_OCUSDC_ADDRESS, name: "Obscura Confidential USDC", symbol: "ocUSDC", decimals: 6, hasFaucet: true,  faucetAmountLabel: "10,000 ocUSDC / 24h", priceUsd: 1.0 },
  ocOBS:  { address: CONFIDENTIAL_OBS_ADDRESS,  name: "Obscura Confidential OBS",  symbol: "ocOBS",  decimals: 6, hasFaucet: true,  faucetAmountLabel: "2 ocOBS / 24h",    priceUsd: 0.10 },
  ocWETH: { address: CONFIDENTIAL_WETH_ADDRESS, name: "Obscura Confidential WETH", symbol: "ocWETH", decimals: 6, hasFaucet: true,  faucetAmountLabel: "2 ocWETH / 24h",   priceUsd: 3000 },
};

// ─── Static market & vault metadata used by the UI ───────────────────────
export interface CreditMarketMeta {
  address?: `0x${string}`;
  label: string;
  loanSymbol: string;
  collateralSymbol: string;
  lltvBps: number;
  liqBonusBps: number;
  liqThresholdBps: number;
  riskTier: "Conservative" | "Balanced" | "Aggressive";
  // Live stats — populated by useMarkets, optional until first poll
  totalSupplyAssets?: bigint;
  totalBorrowAssets?: bigint;
  utilizationBps?: bigint;
  borrowersCount?: bigint;
}

export const CREDIT_MARKETS: CreditMarketMeta[] = [
  {
    address: CREDIT_MARKET_M86_ADDRESS,
    label: "ocUSDC · 86% LLTV",
    loanSymbol: "ocUSDC",
    collateralSymbol: "ocUSDC",
    lltvBps: 8600,
    liqBonusBps: 500,
    liqThresholdBps: 9000,
    riskTier: "Conservative",
  },
  {
    address: CREDIT_MARKET_M70WETH_ADDRESS,
    label: "ocWETH → ocUSDC · 70% LLTV",
    loanSymbol: "ocUSDC",
    collateralSymbol: "ocWETH",
    lltvBps: 7000,
    liqBonusBps: 800,
    liqThresholdBps: 8500,
    riskTier: "Balanced",
  },
  {
    address: CREDIT_MARKET_M50OBS_ADDRESS,
    label: "ocOBS → ocUSDC · 50% LLTV",
    loanSymbol: "ocUSDC",
    collateralSymbol: "ocOBS",
    lltvBps: 5000,
    liqBonusBps: 1200,
    liqThresholdBps: 8000,
    riskTier: "Aggressive",
  },
];

export interface CreditVaultMeta {
  address?: `0x${string}`;
  name: string;
  description: string;
  riskTier: "Conservative" | "Balanced" | "Aggressive";
  marketAddresses: (`0x${string}` | undefined)[];
}

export const CREDIT_VAULTS: CreditVaultMeta[] = [
  {
    address: CREDIT_VAULT_CONSERVATIVE_V2_ADDRESS,
    name: "Obscura Conservative",
    description: "Single-market exposure (M-86, 86% LLTV). Lowest risk, stable yield.",
    riskTier: "Conservative",
    marketAddresses: [CREDIT_MARKET_M86_ADDRESS],
  },
  {
    address: CREDIT_VAULT_BALANCED_V2_ADDRESS,
    name: "Obscura Balanced",
    description: "60% M-86 / 40% M-70-WETH cross-market yield. Higher APY, moderate tail-risk.",
    riskTier: "Balanced",
    marketAddresses: [CREDIT_MARKET_M86_ADDRESS, CREDIT_MARKET_M70WETH_ADDRESS],
  },
];

export const CREDIT_HEALTH_FACTOR_FORMULA =
  "HF = (collateral × price × liqThreshold) / (debt × price). Above 1 = safe.";

export const CREDIT_DEFAULT_AUCTION_WINDOW_SEC = 15 * 60;

export const CREDIT_GAS_CAPS = {
  supply: 2_000_000n,       // +FHE.add encrypted supply shares
  withdraw: 1_800_000n,     // +FHE.sub encrypted supply shares
  supplyCollateral: 1_200_000n,
  withdrawCollateral: 3_500_000n, // FHE.asEuint64(InEuint64) ZKPoK + FHE.sub + outgoing confidentialTransfer (same pattern as borrow, ~3.1M needed)
  borrow: 4_000_000n,             // FHE.asEuint64(InEuint64) ZKPoK (~1.5M) + FHE.add + FHE.asEuint64(plain) + outgoing confidentialTransfer (~1.3M) ≈ 3.3M needed
  repay: 1_100_000n,
  vaultDeposit: 2_200_000n, // +FHE.add encrypted vault shares
  vaultWithdraw: 2_000_000n, // +FHE.sub encrypted vault shares
  vaultReallocate: 1_800_000n, // notifySupply now has FHE.add too
  bid: 700_000n,
  settle: 2_500_000n,
  liquidationOpen: 1_400_000n,
  scoreUpdate: 700_000n,
  scoreAttest: 350_000n,
  hookEnable: 250_000n,
  hookPull: 1_300_000n,
  insuranceSubscribe: 250_000n,
  insuranceTopUp: 1_400_000n,
  approveLLTV: 100_000n,
  setMarketAuctionEngine: 120_000n,
} as const;
