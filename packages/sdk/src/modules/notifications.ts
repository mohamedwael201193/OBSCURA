import type { Address } from "viem";
import { HttpClient, HttpError } from "../core/http.js";
import { normalizeWallet } from "../core/utils.js";
import type { NotificationPrefs, PushSubscriptionJSON } from "../types/index.js";

interface VapidResponse {
  publicKey: string;
}

interface OkResponse {
  ok: boolean;
}

export class NotificationsModule {
  constructor(private readonly http: HttpClient) {}

  async getVapidPublicKey(): Promise<string> {
    const { publicKey } = await this.http.get<VapidResponse>("/vapid-public-key");
    return publicKey;
  }

  async getPrefs(wallet: Address): Promise<NotificationPrefs | null> {
    const normalized = normalizeWallet(wallet);
    if (!normalized) throw new Error("Invalid wallet address");

    try {
      return await this.http.get<NotificationPrefs>(`/prefs/${normalized}`);
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) return null;
      throw err;
    }
  }

  async savePrefs(prefs: NotificationPrefs): Promise<void> {
    const normalized = normalizeWallet(prefs.wallet);
    if (!normalized) throw new Error("Invalid wallet address");

    await this.http.post<OkResponse>("/prefs", {
      ...prefs,
      wallet: normalized,
    });
  }

  async subscribe(wallet: Address, subscription: PushSubscriptionJSON): Promise<void> {
    const normalized = normalizeWallet(wallet);
    if (!normalized) throw new Error("Invalid wallet address");
    if (!subscription?.endpoint) throw new Error("subscription.endpoint is required");

    await this.http.post<OkResponse>("/subscribe", { wallet: normalized, subscription });
  }

  async unsubscribe(wallet: Address): Promise<void> {
    const normalized = normalizeWallet(wallet);
    if (!normalized) throw new Error("Invalid wallet address");

    await this.http.delete<OkResponse>("/subscribe", { wallet: normalized });
  }
}
