/**
 * useAddressBook — encrypted on-chain contacts via ObscuraAddressBook.
 *
 * Each contact is stored as `(labelHash, encMeta)` — labelHash is a keccak256
 * of the user-typed label, encMeta is an FHE eaddress (recipient's wallet OR
 * stealth meta-address slot). The plaintext label is kept locally per-wallet
 * because labels are PII; only the hash goes on-chain so reads can match.
 */
import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { keccak256, toHex } from "viem";
import {
  OBSCURA_ADDRESS_BOOK_ABI,
  OBSCURA_ADDRESS_BOOK_ADDRESS,
} from "@/config/payV2";
import { estimateCappedFees } from "@/lib/gas";
import { encryptAddress, initFHEClient } from "@/lib/fhe";
import { getJSON, setJSON } from "@/lib/scopedStorage";

const LABEL_KEY = "obscura.contacts.labels.v1";

/** Plaintext label cache per (owner, contactId). Lives only on the owner's
 *  device; other devices show "Contact #N" until labels are re-entered or
 *  exported/imported via Settings. */
type LabelCache = Record<string, string>; // contactId -> plaintext label

export interface ContactRow {
  contactId: bigint;
  labelHash: `0x${string}`;
  encMeta: `0x${string}`;
  createdAt: bigint;
  /** Plaintext label if still cached locally. */
  label: string | null;
}

export function useAddressBook() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicClient || !address || !OBSCURA_ADDRESS_BOOK_ADDRESS) {
      setContacts([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let ids: bigint[] = [];
      try {
        ids = (await publicClient.readContract({
          address: OBSCURA_ADDRESS_BOOK_ADDRESS,
          abi: OBSCURA_ADDRESS_BOOK_ABI,
          functionName: "listContactIds",
          args: [address],
        })) as bigint[];
      } catch {
        // First-time user has no contacts — contract may revert on empty
        // mapping reads. Treat as empty list silently.
        setContacts([]);
        setIsLoading(false);
        return;
      }

      const labelCache = getJSON<LabelCache>(LABEL_KEY, address) ?? {};
      const rows: ContactRow[] = [];
      for (const cid of ids) {
        try {
          const [labelHash, encMeta, createdAt] =
            (await publicClient.readContract({
              address: OBSCURA_ADDRESS_BOOK_ADDRESS,
              abi: OBSCURA_ADDRESS_BOOK_ABI,
              functionName: "getContact",
              args: [address, cid],
            })) as [`0x${string}`, `0x${string}`, bigint];
          rows.push({
            contactId: cid,
            labelHash,
            encMeta,
            createdAt,
            label: labelCache[cid.toString()] ?? null,
          });
        } catch {
          // contact removed (sparse) — skip
        }
      }
      setContacts(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addContact = useCallback(
    async (label: string, recipientAddress: `0x${string}`) => {
      if (!publicClient || !walletClient || !address || !OBSCURA_ADDRESS_BOOK_ADDRESS) {
        throw new Error("Wallet or contract not configured");
      }
      const trimmed = label.trim();
      if (!trimmed) throw new Error("Label cannot be empty");

      setIsPending(true);
      setError(null);
      try {
        const labelHash = keccak256(toHex(trimmed));
        await initFHEClient(publicClient, walletClient);
        const encrypted = await encryptAddress(recipientAddress);
        // encryptInputs always returns an array — first element is our InEaddress.
        const encMeta = encrypted[0];
        const fees = await estimateCappedFees(publicClient);

        const hash = await writeContractAsync({
          address: OBSCURA_ADDRESS_BOOK_ADDRESS,
          abi: OBSCURA_ADDRESS_BOOK_ABI,
          functionName: "addContact",
          args: [labelHash, encMeta],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 600_000n,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Read the new contactId from the next-1 counter (single-writer semantics).
        const next = (await publicClient.readContract({
          address: OBSCURA_ADDRESS_BOOK_ADDRESS,
          abi: OBSCURA_ADDRESS_BOOK_ABI,
          functionName: "nextContactId",
          args: [address],
        })) as bigint;
        const newId = next - 1n;

        // Cache plaintext label locally.
        const cache = getJSON<LabelCache>(LABEL_KEY, address) ?? {};
        cache[newId.toString()] = trimmed;
        setJSON(LABEL_KEY, address, cache);

        await refresh();
        return { hash, contactId: newId, receipt };
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, address, refresh]
  );

  const removeContact = useCallback(
    async (contactId: bigint) => {
      if (!publicClient || !walletClient || !address || !OBSCURA_ADDRESS_BOOK_ADDRESS) {
        throw new Error("Wallet or contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_ADDRESS_BOOK_ADDRESS,
          abi: OBSCURA_ADDRESS_BOOK_ABI,
          functionName: "removeContact",
          args: [contactId],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 120_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash });

        const cache = getJSON<LabelCache>(LABEL_KEY, address) ?? {};
        delete cache[contactId.toString()];
        setJSON(LABEL_KEY, address, cache);

        await refresh();
        return hash;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, address, refresh]
  );

  const relabel = useCallback(
    async (contactId: bigint, newLabel: string) => {
      if (!publicClient || !walletClient || !address || !OBSCURA_ADDRESS_BOOK_ADDRESS) {
        throw new Error("Wallet or contract not configured");
      }
      const trimmed = newLabel.trim();
      if (!trimmed) throw new Error("Label cannot be empty");
      setIsPending(true);
      setError(null);
      try {
        const labelHash = keccak256(toHex(trimmed));
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_ADDRESS_BOOK_ADDRESS,
          abi: OBSCURA_ADDRESS_BOOK_ABI,
          functionName: "relabel",
          args: [contactId, labelHash],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 80_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash });

        const cache = getJSON<LabelCache>(LABEL_KEY, address) ?? {};
        cache[contactId.toString()] = trimmed;
        setJSON(LABEL_KEY, address, cache);

        await refresh();
        return hash;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, address, refresh]
  );

  return {
    contacts,
    isLoading,
    isPending,
    error,
    refresh,
    addContact,
    removeContact,
    relabel,
  };
}
