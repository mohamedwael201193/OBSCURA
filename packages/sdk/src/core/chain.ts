import {
  createPublicClient,
  encodeFunctionData,
  http,
  type Abi,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { ARBITRUM_SEPOLIA_CHAIN_ID, DEFAULT_RPC_URL } from "../config/defaults.js";
import type { ContractCall } from "../types/index.js";

export function resolveChain(chainId: number): Chain {
  if (chainId === ARBITRUM_SEPOLIA_CHAIN_ID) return arbitrumSepolia;
  return {
    ...arbitrumSepolia,
    id: chainId,
  };
}

export function createDefaultPublicClient(rpcUrl: string, chainId: number): PublicClient {
  return createPublicClient({
    chain: resolveChain(chainId),
    transport: http(rpcUrl || DEFAULT_RPC_URL),
  });
}

export function encodeCall(call: ContractCall): Hex {
  return encodeFunctionData({
    abi: call.abi as Abi,
    functionName: call.functionName,
    args: [...call.args],
  });
}

export async function sendContractCall(
  call: ContractCall,
  walletClient: WalletClient,
  account: Address,
): Promise<Hex> {
  const hash = await walletClient.writeContract({
    address: call.address,
    abi: call.abi as Abi,
    functionName: call.functionName,
    args: [...call.args],
    chain: resolveChain(call.chainId),
    account,
  });
  return hash;
}

export function makeCall(
  chainId: number,
  address: Address,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[],
): ContractCall {
  return { address, abi, functionName, args, chainId };
}
