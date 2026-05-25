/**
 * useActivityFeed.ts — Supabase Realtime + polling activity feed hook
 *
 * Subscribes to live activity for the connected wallet:
 *   - Primary: Supabase Realtime channel (instant)
 *   - Fallback: 30s polling via REST query
 *
 * IMPORTANT: No auto-decrypt on mount. Wallet connection is user-initiated.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAccount } from "wagmi";

const SUPABASE_URL    = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON   = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const POLL_INTERVAL   = 30_000;
const PAGE_SIZE       = 20;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export type ActivityEventType =
  | "all"
  | "sent"
  | "received"
  | "stream"
  | "invoice"
  | "escrow"
  | "stealth";

export interface ActivityItem {
  id:               number;
  chain_id:         number;
  block_number:     string;
  tx_hash:          string;
  log_index:        number;
  contract_address: string;
  event_name:       string;
  wallet:           string;
  participants:     string[];
  args:             Record<string, unknown>;
  created_at:       string;
}

const EVENT_TYPE_FILTERS: Record<ActivityEventType, string[]> = {
  all:      [],
  sent:     ["ObscuraPay.PaymentSent"],
  received: ["ObscuraPay.PaymentReceived"],
  stream:   ["ObscuraPayStreamV2.StreamCreated", "ObscuraPayStreamV2.StreamCancelled", "ObscuraPayStreamV2.StreamWithdrawn"],
  invoice:  ["ObscuraInvoice.InvoiceCreated", "ObscuraInvoice.InvoicePaid"],
  escrow:   ["ObscuraConfidentialEscrow.EscrowDeposited", "ObscuraConfidentialEscrow.EscrowReleased", "ObscuraConfidentialEscrow.EscrowRefunded"],
  stealth:  ["ObscuraStealthRegistry.StealthAddressRegistered"],
};

interface UseActivityFeedResult {
  items:      ActivityItem[];
  isLoading:  boolean;
  error:      string | null;
  filter:     ActivityEventType;
  setFilter:  (f: ActivityEventType) => void;
  loadMore:   () => void;
  hasMore:    boolean;
  refresh:    () => void;
}

export function useActivityFeed(): UseActivityFeedResult {
  const { address } = useAccount();
  const wallet      = address?.toLowerCase() ?? null;

  const [items,     setItems]     = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<ActivityEventType>("all");
  const [page,      setPage]      = useState(0);
  const [hasMore,   setHasMore]   = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch page ─────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (pageIndex: number, replace: boolean) => {
    if (!wallet) return;
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("obscura_activity")
        .select("*")
        .contains("participants", [wallet])
        .order("block_number", { ascending: false })
        .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

      const allowed = EVENT_TYPE_FILTERS[filter];
      if (allowed.length > 0) {
        query = query.in("event_name", allowed);
      }

      const { data, error: err } = await query;
      if (err) throw new Error(err.message);

      const newItems = (data ?? []) as ActivityItem[];
      setHasMore(newItems.length === PAGE_SIZE);
      setItems((prev) => replace ? newItems : [...prev, ...newItems]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [wallet, filter]);

  // ── Initial fetch + re-fetch on wallet/filter change ──────────────────────
  useEffect(() => {
    if (!wallet) { setItems([]); return; }
    setPage(0);
    fetchPage(0, true);
  }, [wallet, filter, fetchPage]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!wallet) return;

    const channel = supabase
      .channel(`activity:${wallet}`)
      .on(
        "postgres_changes" as never,
        {
          event:  "INSERT",
          schema: "public",
          table:  "obscura_activity",
          filter: `wallet=eq.${wallet}`,
        } as never,
        (payload: { new: ActivityItem }) => {
          const newItem = payload.new;
          const allowed = EVENT_TYPE_FILTERS[filter];
          if (allowed.length === 0 || allowed.includes(newItem.event_name)) {
            setItems((prev) => [newItem, ...prev]);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Fallback polling (if Realtime drops)
    pollRef.current = setInterval(() => fetchPage(0, true), POLL_INTERVAL);

    return () => {
      channel.unsubscribe();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [wallet, filter, fetchPage]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, false);
  }, [page, fetchPage]);

  const refresh = useCallback(() => {
    setPage(0);
    fetchPage(0, true);
  }, [fetchPage]);

  return useMemo(() => ({
    items, isLoading, error, filter, setFilter, loadMore, hasMore, refresh,
  }), [items, isLoading, error, filter, loadMore, hasMore, refresh]);
}
