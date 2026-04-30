import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from "@/config/contracts";

export type ActivityEventType = "vote" | "proposal" | "finalized" | "cancelled";

export interface VoteActivityEvent {
  id: string;
  type: ActivityEventType;
  message: string;
  proposalId: number;
  timestamp: number; // unix seconds
}

const MAX_EVENTS = 10;

export function useVoteActivity() {
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<VoteActivityEvent[]>([]);
  const unsubRefs = useRef<Array<() => void>>([]);

  const push = useCallback((evt: Omit<VoteActivityEvent, "id" | "timestamp">) => {
    setEvents((prev) => {
      const next: VoteActivityEvent = {
        ...evt,
        id: `${evt.type}-${evt.proposalId}-${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000),
      };
      return [next, ...prev].slice(0, MAX_EVENTS);
    });
  }, []);

  useEffect(() => {
    if (!publicClient || !OBSCURA_VOTE_ADDRESS) return;

    // Unsubscribe any previous watchers
    unsubRefs.current.forEach((unsub) => unsub());
    unsubRefs.current = [];

    // VoteCast — privacy: never expose voter address
    const unsubVote = publicClient.watchContractEvent({
      address: OBSCURA_VOTE_ADDRESS,
      abi: OBSCURA_VOTE_ABI,
      eventName: "VoteCast",
      onLogs: (logs) => {
        for (const log of logs) {
          const proposalId = Number((log as any).args?.proposalId ?? 0);
          push({
            type: "vote",
            message: `A vote was cast on proposal #${proposalId}`,
            proposalId,
          });
        }
      },
    });

    // ProposalCreated
    const unsubCreated = publicClient.watchContractEvent({
      address: OBSCURA_VOTE_ADDRESS,
      abi: OBSCURA_VOTE_ABI,
      eventName: "ProposalCreated",
      onLogs: (logs) => {
        for (const log of logs) {
          const proposalId = Number((log as any).args?.proposalId ?? 0);
          const title = String((log as any).args?.title ?? `Proposal #${proposalId}`);
          push({
            type: "proposal",
            message: `New proposal #${proposalId}: "${title}"`,
            proposalId,
          });
        }
      },
    });

    // VoteFinalized
    const unsubFinalized = publicClient.watchContractEvent({
      address: OBSCURA_VOTE_ADDRESS,
      abi: OBSCURA_VOTE_ABI,
      eventName: "VoteFinalized",
      onLogs: (logs) => {
        for (const log of logs) {
          const proposalId = Number((log as any).args?.proposalId ?? 0);
          push({
            type: "finalized",
            message: `Proposal #${proposalId} finalized — results now public`,
            proposalId,
          });
        }
      },
    });

    // ProposalCancelled (optional, may not exist on older ABI)
    let unsubCancelled: (() => void) | undefined;
    try {
      unsubCancelled = publicClient.watchContractEvent({
        address: OBSCURA_VOTE_ADDRESS,
        abi: OBSCURA_VOTE_ABI,
        eventName: "ProposalCancelled",
        onLogs: (logs) => {
          for (const log of logs) {
            const proposalId = Number((log as any).args?.proposalId ?? 0);
            push({
              type: "cancelled",
              message: `Proposal #${proposalId} was cancelled`,
              proposalId,
            });
          }
        },
      });
    } catch {
      // event may not be in ABI, ignore
    }

    unsubRefs.current = [
      unsubVote,
      unsubCreated,
      unsubFinalized,
      ...(unsubCancelled ? [unsubCancelled] : []),
    ];

    return () => {
      unsubRefs.current.forEach((unsub) => unsub());
      unsubRefs.current = [];
    };
  }, [publicClient, push]);

  return events;
}
