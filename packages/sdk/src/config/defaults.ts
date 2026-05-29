import type { Address } from "viem";

/** Arbitrum Sepolia deployment snapshot — sync from contracts-hardhat/deployments/arb-sepolia.json */
export interface ObscuraAddresses {
  ocUSDC_Pay: Address;
  ObscuraPay: Address;
  ObscuraPayStreamV3: Address;
  ObscuraConfidentialEscrow: Address;
  ObscuraInvoice: Address;
  ObscuraStealthRegistry: Address;
  ObscuraVote: Address;
  ObscuraTreasury: Address;
  ObscuraRewards: Address;
  ObscuraCreditFactory: Address;
  ObscuraCreditOracle: Address;
  ObscuraCreditIRM: Address;
  ObscuraCreditAuction: Address;
  ObscuraCreditScoreV2: Address;
  CreditCanonicalPayOcUSDCMarket: Address;
  v2_ConservativeVault: Address;
  v2_BalancedVault: Address;
  ObscuraGovernor: Address;
  ObscuraTimelock: Address;
}

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

export const DEFAULT_RPC_URL = "https://sepolia-rollup.arbitrum.io/rpc";
export const DEFAULT_API_URL = "https://obscura-api-n62v.onrender.com";
export const DEFAULT_SUPABASE_URL = "https://quoovjkjwgtdqwdofubh.supabase.co";

export const DEFAULT_ADDRESSES: ObscuraAddresses = {
  ocUSDC_Pay: "0xEd46020Df8abe7BB1E096f27d089F4326D223a53",
  ObscuraPay: "0x91CdD9a481C732bEB09Ce039da23DC11e83547a4",
  ObscuraPayStreamV3: "0xE4328F139F03138D63f7fdF90A8Ef240e04653fA",
  ObscuraConfidentialEscrow: "0x293810A2081114CcE0c98A709a0c31aE07c01D75",
  ObscuraInvoice: "0x62a86C8d68fF32ea41Faf349db6EF7EF496620b7",
  ObscuraStealthRegistry: "0xa36e791a611D36e2C817a7DA0f41547D30D4917d",
  ObscuraVote: "0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730",
  ObscuraTreasury: "0x89252ee3f920978EEfDB650760fe56BA1Ede8c08",
  ObscuraRewards: "0x435ea117404553A6868fbe728A7A284FCEd15BC2",
  ObscuraCreditFactory: "0x5aDC1965D155f4b18119222CBA7a7A4be4F45680",
  ObscuraCreditOracle: "0x5F00910533AB6fc12a35a87BaFe856EF2cb323c3",
  ObscuraCreditIRM: "0xA072c038cE98dEC8F5350D451145fB98F5EA57Bc",
  ObscuraCreditAuction: "0x205FfC0A3b8207B645c1a6B1b4805eb3FfC828F0",
  ObscuraCreditScoreV2: "0xe5B0c6c06C0B1fd7d7CD5D2e93997693863d3D4D",
  CreditCanonicalPayOcUSDCMarket: "0x1Ec113297c7F9516A6604aa3b18C180559a6f551",
  v2_ConservativeVault: "0xCEBb042ae8FDE217a9FdE5b8a82E23827FdBB898",
  v2_BalancedVault: "0xF508315bD4C5EC4c71C5E431AE972C0dC6B78Bbc",
  ObscuraGovernor: "0xE4807C9F90a0da8F5B5bafa4361B15ff855b7186",
  ObscuraTimelock: "0x07b7961627f433a1d9001F82Ac4af9F19b9a9E05",
};

export function mergeAddresses(partial?: Partial<ObscuraAddresses>): ObscuraAddresses {
  return { ...DEFAULT_ADDRESSES, ...partial };
}
