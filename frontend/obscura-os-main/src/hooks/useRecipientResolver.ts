/**
 * useRecipientResolver — accept "anything that identifies a recipient":
 *   • 0x… address  → returns it as-is + (optional) on-chain meta
 *   • name.eth     → ENS resolution via the connected publicClient
 *   • @handle      → ObscuraSocialResolver lookup
 *   • Contact #N   → not handled here (use ContactPicker)
 */
import { useCallback, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { isAddress } from "viem";
import { useSocialResolver } from "./useSocialResolver";
import { loadStoredMetaPublic, type MetaAddress } from "@/lib/stealth";

export type ResolverInputKind =
  | "address"
  | "ens"
  | "handle"
  | "self"
  | "unknown";

export interface ResolvedRecipient {
  kind: ResolverInputKind;
  raw: string;
  address: `0x${string}` | null;
  meta: MetaAddress | null;
  label?: string;
  selfClaimed?: boolean;
  warning?: string;
}

export function useRecipientResolver() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const social = useSocialResolver();
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(
    async (input: string): Promise<ResolvedRecipient> => {
      const trimmed = input.trim();
      setIsResolving(true);
      setError(null);
      try {
        if (!trimmed) return { kind: "unknown", raw: trimmed, address: null, meta: null };

        if (trimmed.toLowerCase() === "self" || (address && trimmed.toLowerCase() === address.toLowerCase())) {
          return {
            kind: "self",
            raw: trimmed,
            address: address ?? null,
            meta: loadStoredMetaPublic(address),
            label: "Yourself",
          };
        }

        if (isAddress(trimmed)) {
          return { kind: "address", raw: trimmed, address: trimmed as `0x${string}`, meta: null };
        }

        if (trimmed.endsWith(".eth")) {
          if (!publicClient) {
            return {
              kind: "ens",
              raw: trimmed,
              address: null,
              meta: null,
              warning: "ENS lookup requires a public RPC client",
            };
          }
          try {
            const ensAddr = await publicClient.getEnsAddress({ name: trimmed });
            return {
              kind: "ens",
              raw: trimmed,
              address: ensAddr ?? null,
              meta: null,
              label: trimmed,
              warning: ensAddr ? undefined : "ENS name did not resolve",
            };
          } catch (e) {
            return {
              kind: "ens",
              raw: trimmed,
              address: null,
              meta: null,
              warning: `ENS resolve failed: ${(e as Error).message}`,
            };
          }
        }

        if (trimmed.startsWith("@") || /^[a-z0-9_-]{3,32}$/i.test(trimmed)) {
          const handle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
          const r = await social.resolve(handle);
          if (!r) {
            return {
              kind: "handle",
              raw: trimmed,
              address: null,
              meta: null,
              warning: "Handle not registered",
            };
          }
          return {
            kind: "handle",
            raw: trimmed,
            address: r.owner,
            meta: r.meta,
            label: `@${handle}`,
            selfClaimed: r.selfClaimed,
            warning: r.selfClaimed ? "Self-claimed handle (no ENS proof)" : undefined,
          };
        }

        return {
          kind: "unknown",
          raw: trimmed,
          address: null,
          meta: null,
          warning: "Unrecognised input — use 0x address, name.eth, or @handle",
        };
      } finally {
        setIsResolving(false);
      }
    },
    [publicClient, address, social]
  );

  return { resolve, isResolving, error, setError };
}
