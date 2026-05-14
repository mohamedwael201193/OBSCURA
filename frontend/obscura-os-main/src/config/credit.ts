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
import ObscuraCreditStreamHookAbi from "@/abis/credit/ObscuraCreditStreamHook.json";
import ObscuraCreditInsuranceHookAbi from "@/abis/credit/ObscuraCreditInsuranceHook.json";
import ObscuraCreditGovernanceProxyAbi from "@/abis/credit/ObscuraCreditGovernanceProxy.json";
import MockChainlinkFeedAbi from "@/abis/credit/MockChainlinkFeed.json";
import ObscuraConfidentialTokenAbi from "@/abis/credit/ObscuraConfidentialToken.json";

// ─── Addresses (Arbitrum Sepolia 421614) ─────────────────────────────────
export const CREDIT_FACTORY_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_FACTORY_ADDRESS as `0x${string}` | undefined;
export const CREDIT_ORACLE_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_ORACLE_ADDRESS as `0x${string}` | undefined;
export const CREDIT_IRM_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_IRM_ADDRESS as `0x${string}` | undefined;
export const CREDIT_AUCTION_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_AUCTION_ADDRESS as `0x${string}` | undefined;
export const CREDIT_SCORE_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_SCORE_ADDRESS as `0x${string}` | undefined;
export const CREDIT_STREAM_HOOK_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_STREAM_HOOK_ADDRESS as `0x${string}` | undefined;
export const CREDIT_INSURANCE_HOOK_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_INSURANCE_HOOK_ADDRESS as `0x${string}` | undefined;
export const CREDIT_GOVERNANCE_PROXY_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_GOVERNANCE_PROXY_ADDRESS as `0x${string}` | undefined;

export const CREDIT_MARKET_77_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_MARKET_77_ADDRESS as `0x${string}` | undefined;
export const CREDIT_MARKET_86_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_MARKET_86_ADDRESS as `0x${string}` | undefined;
export const CREDIT_MARKET_COBS_CUSDC_ADDRESS  = import.meta.env.VITE_OBSCURA_CREDIT_MARKET_COBS_CUSDC_ADDRESS  as `0x${string}` | undefined;
export const CREDIT_MARKET_CWETH_CUSDC_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_MARKET_CWETH_CUSDC_ADDRESS as `0x${string}` | undefined;
export const CREDIT_VAULT_CONSERVATIVE_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_VAULT_CONSERVATIVE_ADDRESS as `0x${string}` | undefined;
export const CREDIT_VAULT_AGGRESSIVE_ADDRESS = import.meta.env.VITE_OBSCURA_CREDIT_VAULT_AGGRESSIVE_ADDRESS as `0x${string}` | undefined;

// Confidential token addresses (cUSDC = Reineira; cOBS / cWETH = Obscura).
export const CONFIDENTIAL_USDC_ADDRESS  = import.meta.env.VITE_OBSCURA_CONFIDENTIAL_USDC_ADDRESS  as `0x${string}` | undefined;
export const CONFIDENTIAL_OBS_ADDRESS   = import.meta.env.VITE_OBSCURA_CONFIDENTIAL_OBS_ADDRESS   as `0x${string}` | undefined;
export const CONFIDENTIAL_WETH_ADDRESS  = import.meta.env.VITE_OBSCURA_CONFIDENTIAL_WETH_ADDRESS  as `0x${string}` | undefined;

// ─── ABIs (re-exported for hooks/components) ─────────────────────────────
export const CREDIT_FACTORY_ABI = ObscuraCreditFactoryAbi as any;
export const CREDIT_MARKET_ABI = ObscuraCreditMarketAbi as any;
export const CREDIT_VAULT_ABI = ObscuraCreditVaultAbi as any;
export const CREDIT_AUCTION_ABI = ObscuraCreditAuctionAbi as any;
export const CREDIT_ORACLE_ABI = ObscuraCreditOracleAbi as any;
export const CREDIT_IRM_ABI = ObscuraCreditIRMAbi as any;
export const CREDIT_SCORE_ABI = ObscuraCreditScoreAbi as any;
export const CREDIT_STREAM_HOOK_ABI = ObscuraCreditStreamHookAbi as any;
export const CREDIT_INSURANCE_HOOK_ABI = ObscuraCreditInsuranceHookAbi as any;
export const CREDIT_GOVERNANCE_PROXY_ABI = ObscuraCreditGovernanceProxyAbi as any;
export const MOCK_CHAINLINK_FEED_ABI = MockChainlinkFeedAbi as any;
export const CONFIDENTIAL_TOKEN_ABI = ObscuraConfidentialTokenAbi as any;

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
  cUSDC: { address: CONFIDENTIAL_USDC_ADDRESS, name: "Confidential USDC", symbol: "cUSDC", decimals: 8, hasFaucet: false,                              priceUsd: 1.0 },
  cOBS:  { address: CONFIDENTIAL_OBS_ADDRESS,  name: "Confidential OBS",  symbol: "cOBS",  decimals: 8, hasFaucet: true,  faucetAmountLabel: "100 cOBS / 24h",   priceUsd: 0.10 },
  cWETH: { address: CONFIDENTIAL_WETH_ADDRESS, name: "Confidential WETH", symbol: "cWETH", decimals: 8, hasFaucet: true,  faucetAmountLabel: "0.1 cWETH / 24h", priceUsd: 3000 },
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
}

export const CREDIT_MARKETS: CreditMarketMeta[] = [
  {
    address: CREDIT_MARKET_77_ADDRESS,
    label: "cUSDC / cUSDC · 77% LLTV",
    loanSymbol: "cUSDC",
    collateralSymbol: "cUSDC",
    lltvBps: 7700,
    liqBonusBps: 500,
    liqThresholdBps: 8500,
    riskTier: "Balanced",
  },
  {
    address: CREDIT_MARKET_86_ADDRESS,
    label: "cUSDC / cUSDC · 86% LLTV",
    loanSymbol: "cUSDC",
    collateralSymbol: "cUSDC",
    lltvBps: 8600,
    liqBonusBps: 750,
    liqThresholdBps: 9000,
    riskTier: "Aggressive",
  },
  {
    address: CREDIT_MARKET_COBS_CUSDC_ADDRESS,
    label: "cOBS → cUSDC · 77% LLTV",
    loanSymbol: "cUSDC",
    collateralSymbol: "cOBS",
    lltvBps: 7700,
    liqBonusBps: 500,
    liqThresholdBps: 8500,
    riskTier: "Balanced",
  },
  {
    address: CREDIT_MARKET_CWETH_CUSDC_ADDRESS,
    label: "cWETH → cUSDC · 86% LLTV",
    loanSymbol: "cUSDC",
    collateralSymbol: "cWETH",
    lltvBps: 8600,
    liqBonusBps: 750,
    liqThresholdBps: 9000,
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
    address: CREDIT_VAULT_CONSERVATIVE_ADDRESS,
    name: "Obscura Conservative",
    description: "Single-market exposure (77% LLTV). Lowest expected APY, lowest tail-risk.",
    riskTier: "Conservative",
    marketAddresses: [CREDIT_MARKET_77_ADDRESS],
  },
  {
    address: CREDIT_VAULT_AGGRESSIVE_ADDRESS,
    name: "Obscura Aggressive",
    description: "Mixed exposure across 77% + 86% LLTV markets for higher yield.",
    riskTier: "Aggressive",
    marketAddresses: [CREDIT_MARKET_77_ADDRESS, CREDIT_MARKET_86_ADDRESS],
  },
];

export const CREDIT_HEALTH_FACTOR_FORMULA =
  "HF = (collateral × price × liqThreshold) / (debt × price). Above 1 = safe.";

export const CREDIT_DEFAULT_AUCTION_WINDOW_SEC = 15 * 60;

export const CREDIT_GAS_CAPS = {
  supply: 2_000_000n,       // +FHE.add encrypted supply shares
  withdraw: 1_800_000n,     // +FHE.sub encrypted supply shares
  supplyCollateral: 1_200_000n,
  withdrawCollateral: 1_400_000n,
  borrow: 1_400_000n,
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
