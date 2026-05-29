import type { Address, PublicClient } from "viem";
import { OBSCURA_VOTE_ABI } from "../abis/index.js";
import { makeCall } from "../core/chain.js";
import { resolveInEuint64, toContractInEuint64 } from "../core/utils.js";
import type { ObscuraAddresses } from "../config/defaults.js";
import type { FheProvider } from "../fhe/types.js";
import type { ContractCall, InEuint64, ProposalState } from "../types/index.js";

export interface VoteModuleDeps {
  chainId: number;
  addresses: ObscuraAddresses;
  publicClient: PublicClient;
  fhe?: FheProvider;
}

export class VoteModule {
  constructor(private readonly deps: VoteModuleDeps) {}

  get voteAddress(): Address {
    return this.deps.addresses.ObscuraVote;
  }

  async getProposalCount(): Promise<bigint> {
    return this.deps.publicClient.readContract({
      address: this.deps.addresses.ObscuraVote,
      abi: OBSCURA_VOTE_ABI,
      functionName: "proposalCount",
    }) as Promise<bigint>;
  }

  async getProposal(id: bigint): Promise<ProposalState> {
    const result = (await this.deps.publicClient.readContract({
      address: this.deps.addresses.ObscuraVote,
      abi: OBSCURA_VOTE_ABI,
      functionName: "getProposal",
      args: [id],
    })) as readonly [Address, string, string, string[], bigint, bigint, boolean, bigint];

    return {
      id,
      creator: result[0],
      title: result[1],
      description: result[2],
      options: [...result[3]],
      startTime: result[4],
      endTime: result[5],
      finalized: result[6],
      winningOption: result[7],
    };
  }

  async buildCastVote(
    proposalId: bigint,
    optionIndex: number,
    encryptedOption?: InEuint64,
  ): Promise<ContractCall> {
    const enc = await resolveInEuint64(
      BigInt(optionIndex),
      this.deps.addresses.ObscuraVote,
      this.deps.fhe,
      encryptedOption,
    );
    return makeCall(
      this.deps.chainId,
      this.deps.addresses.ObscuraVote,
      OBSCURA_VOTE_ABI,
      "castVote",
      [proposalId, toContractInEuint64(enc)],
    );
  }

  buildDelegate(delegatee: Address): ContractCall {
    return makeCall(
      this.deps.chainId,
      this.deps.addresses.ObscuraVote,
      OBSCURA_VOTE_ABI,
      "delegate",
      [delegatee],
    );
  }
}
