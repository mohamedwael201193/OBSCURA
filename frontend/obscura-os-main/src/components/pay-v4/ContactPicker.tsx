/**
 * ContactPicker — dropdown that surfaces locally-labelled contacts and
 * accepts free-text input that the parent resolves via
 * `useRecipientResolver` (address / ENS / handle).
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, BookUser } from "lucide-react";
import { useAddressBook } from "@/hooks/useAddressBook";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export default function ContactPicker({
  value,
  onChange,
  placeholder = "0x address, name.eth, @handle, or contact label",
  label = "Recipient",
  disabled,
}: Props) {
  const { contacts } = useAddressBook();
  const [open, setOpen] = useState(false);

  const labelled = contacts.filter((c) => c.label);

  const select = (display: string) => {
    onChange(display);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Label className="text-[11px] tracking-wide uppercase text-muted-foreground/70">{label}</Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="font-mono text-[12px] flex-1"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled || labelled.length === 0}
          className="px-2.5 rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-40 flex items-center gap-1 text-[11px] text-muted-foreground/80"
          title={labelled.length === 0 ? "No labelled contacts" : "Pick from contacts"}
        >
          <BookUser className="w-3.5 h-3.5" />
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {open && labelled.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-white/10 bg-black/90 backdrop-blur-md shadow-xl max-h-60 overflow-auto">
          {labelled.map((c) => (
            <button
              key={c.contactId.toString()}
              type="button"
              onClick={() => select(c.label!)}
              className="block w-full text-left px-3 py-2 hover:bg-white/[0.06] border-b border-white/[0.04] last:border-b-0"
            >
              <div className="text-[12px] text-foreground">{c.label}</div>
              <div className="text-[10px] text-muted-foreground/55 font-mono">
                Contact #{c.contactId.toString()} · added{" "}
                {new Date(Number(c.createdAt) * 1000).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
