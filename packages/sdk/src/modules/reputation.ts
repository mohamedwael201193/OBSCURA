import type { Address } from "viem";
import type { HttpClient } from "../core/http.js";
import { normalizeWallet } from "../core/utils.js";
import type { ReputationSummary } from "../types/index.js";

export class ReputationModule {
  constructor(private readonly http: HttpClient) {}

  async getSummary(wallet: Address): Promise<ReputationSummary> {
    const normalized = normalizeWallet(wallet);
    if (!normalized) {
      throw new Error("Invalid wallet address");
    }
    return this.http.get<ReputationSummary>(`/reputation/${normalized}`);
  }
}
