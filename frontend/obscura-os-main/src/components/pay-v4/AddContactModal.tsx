/**
 * AddContactModal — small modal that runs `useAddressBook.addContact()`.
 *
 * The plaintext label never goes on chain; only `keccak256(label)` is stored.
 * The wallet/stealth address is encrypted with FHE and stored as `eaddress`.
 */
import { useState } from "react";
import { isAddress } from "viem";
import { Card } from "@/components/elite/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Loader2, AlertTriangle } from "lucide-react";
import { useAddressBook } from "@/hooks/useAddressBook";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded?: (contactId: bigint) => void;
}

export default function AddContactModal({ open, onClose, onAdded }: Props) {
  const { addContact, isPending } = useAddressBook();
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    const trimmedLabel = label.trim();
    const trimmedTarget = target.trim();
    if (!trimmedLabel) {
      setError("Label is required");
      return;
    }
    if (!isAddress(trimmedTarget)) {
      setError("Target must be a 0x address.");
      return;
    }
    try {
      const { contactId } = await addContact(
        trimmedLabel,
        trimmedTarget as `0x${string}`
      );
      setLabel("");
      setTarget("");
      onAdded?.(contactId);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <Card className="max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground/60 hover:text-foreground"
          disabled={isPending}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="font-display text-lg text-foreground mb-1">Add contact</h2>
        <p className="text-[12px] text-muted-foreground/65 mb-5 leading-relaxed">
          The label is hashed and the address is FHE-encrypted before being
          stored on-chain. Plaintext labels live only in this browser.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="label" className="text-[11px] tracking-wide uppercase text-muted-foreground/70">
              Label
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Alice, Treasury, Vendor #42"
              disabled={isPending}
              className="mt-1.5"
              maxLength={64}
            />
          </div>
          <div>
            <Label htmlFor="target" className="text-[11px] tracking-wide uppercase text-muted-foreground/70">
              Address
            </Label>
            <Input
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0x..."
              disabled={isPending}
              className="mt-1.5 font-mono text-[12px]"
              spellCheck={false}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-[12px] text-red-300 bg-red-500/[0.06] border border-red-500/20 p-2.5 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Encrypting…
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add contact
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
