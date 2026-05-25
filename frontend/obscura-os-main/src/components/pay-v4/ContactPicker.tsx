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
import { payHarmony as h } from "@/components/harmony/payHarmonyClasses";

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
  placeholder = "0x address or saved contact label",
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
      <Label className={h.label}>{label}</Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 font-mono text-sm"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled || labelled.length === 0}
          className={h.pillBtn}
          title={labelled.length === 0 ? "No labelled contacts" : "Pick from contacts"}
        >
          <BookUser className="w-3.5 h-3.5" />
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {open && labelled.length > 0 && (
        <div className={h.dropdown}>
          {labelled.map((c) => (
            <button
              key={c.contactId.toString()}
              type="button"
              onClick={() => select(c.label!)}
              className={h.dropdownItem}
            >
              <div className="text-sm text-foreground">{c.label}</div>
              <div className="font-mono text-[10px] text-muted-foreground">
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
