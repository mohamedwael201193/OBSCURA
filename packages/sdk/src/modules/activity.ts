import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Address } from "viem";
import { ACTIVITY_EVENT_FILTERS, type ActivityEventFilterMap } from "../config/activity-filters.js";
import { DEFAULT_SUPABASE_URL } from "../config/defaults.js";
import { normalizeWallet } from "../core/utils.js";
import type {
  ActivityEventType,
  ActivityItem,
  ActivityListOptions,
  ActivityListResult,
} from "../types/index.js";

const DEFAULT_PAGE_SIZE = 20;

export class ActivityModule {
  private readonly client: SupabaseClient | null;
  readonly supabaseUrl: string | undefined;
  readonly supabaseAnonKey: string | undefined;

  constructor(supabaseUrl: string | undefined, supabaseAnonKey: string | undefined) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
    this.client =
      supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
  }

  /** True when both Supabase URL and anon key were supplied at SDK init. */
  isConfigured(): boolean {
    return this.client !== null;
  }

  getEventFilters(): ActivityEventFilterMap {
    return ACTIVITY_EVENT_FILTERS;
  }

  async listForWallet(wallet: Address, options: ActivityListOptions = {}): Promise<ActivityListResult> {
    if (!this.client) {
      throw new Error(
        [
          "Activity module requires Supabase credentials.",
          `Pass supabaseAnonKey (and optionally supabaseUrl) to ObscuraSDK.create().`,
          `Default URL: ${DEFAULT_SUPABASE_URL}`,
          "Get the anon key from your Supabase project → Settings → API → anon public.",
          "Reputation and notifications work without Supabase; activity does not.",
        ].join(" "),
      );
    }

    const normalized = normalizeWallet(wallet);
    if (!normalized) throw new Error("Invalid wallet address");

    const filter: ActivityEventType = options.filter ?? "all";
    const page = options.page ?? 0;
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

    let query = this.client
      .from("obscura_activity")
      .select("*")
      .contains("participants", [normalized])
      .order("block_number", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    const allowed = ACTIVITY_EVENT_FILTERS[filter];
    if (allowed.length > 0) {
      query = query.in("event_name", [...allowed]);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const items = (data ?? []) as ActivityItem[];

    return {
      items,
      page,
      pageSize,
      hasMore: items.length === pageSize,
    };
  }
}
