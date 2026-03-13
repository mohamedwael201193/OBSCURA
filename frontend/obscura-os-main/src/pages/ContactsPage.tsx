/**
 * ContactsPage — full-page address-book view (route: /pay/contacts).
 *
 * Lists every contact for the connected wallet, lets the user add via
 * `<AddContactModal>`, relabel inline, or remove. The on-chain record is
 * encrypted; the plaintext label cache is local-only.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  ArrowLeft,
  BookUser,
} from "lucide-react";

import { Card, PageHeader } from "@/components/elite/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddContactModal from "@/components/pay-v4/AddContactModal";
import { useAddressBook } from "@/hooks/useAddressBook";

export default function ContactsPage() {
  const { contacts, isLoading, isPending, error, refresh, removeContact, relabel } = useAddressBook();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  const startEdit = (id: string, current: string | null) => {
    setEditingId(id);
    setDraftLabel(current ?? "");
  };

  const saveEdit = async (cidStr: string) => {
    if (!draftLabel.trim()) return;
    try {
      await relabel(BigInt(cidStr), draftLabel.trim());
      setEditingId(null);
    } catch {
      /* error surfaced below */
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/pay"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/70 hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Pay
        </Link>

        <PageHeader
          breadcrumb={["Pay", "Address Book", "Contacts"]}
          title="Contacts"
          lede="Encrypted on-chain contact list. Labels are kept locally; only their hashes and FHE-encrypted target addresses live on-chain."
        />

        <div className="flex items-center justify-between my-6">
          <div className="text-[12px] text-muted-foreground/70 font-mono">
            {contacts.length} contact{contacts.length === 1 ? "" : "s"}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void refresh()} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add contact
            </Button>
          </div>
        </div>

        {error && (
          <Card className="p-4 border-red-500/30 bg-red-500/[0.05] text-[12px] text-red-300 mb-4">
            {error}
          </Card>
        )}

        {contacts.length === 0 && !isLoading ? (
          <Card className="p-12 text-center">
            <BookUser className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
            <div className="font-display text-foreground mb-1">No contacts yet</div>
            <p className="text-[12px] text-muted-foreground/65 max-w-sm mx-auto mb-4">
              Add a contact to send encrypted payments without retyping addresses.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add your first contact
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {contacts.map((c) => {
              const idStr = c.contactId.toString();
              const isEditing = editingId === idStr;
              return (
                <motion.div
                  key={idStr}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-md border border-white/[0.06] bg-white/[0.02]"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/[0.1] border border-emerald-500/30 flex items-center justify-center text-[11px] text-emerald-300 font-mono">
                    {idStr}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <Input
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                        autoFocus
                        className="text-[12px]"
                      />
                    ) : (
                      <div className="text-[13px] text-foreground truncate">
                        {c.label ?? <span className="text-muted-foreground/50">Contact #{idStr}</span>}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground/45 font-mono truncate">
                      {c.labelHash} · created {new Date(Number(c.createdAt) * 1000).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void saveEdit(idStr)}
                          disabled={isPending}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          disabled={isPending}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(idStr, c.label)}
                          disabled={isPending}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void removeContact(c.contactId)}
                          disabled={isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <AddContactModal open={open} onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}
