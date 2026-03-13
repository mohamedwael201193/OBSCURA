import type { LucideIcon } from "lucide-react";
import {
  Binary,
  CircuitBoard,
  FileSignature,
  GlobeLock,
  Banknote,
  Landmark,
  Vote,
  ShieldCheck,
  Layers,
  ScanEye,
  Fingerprint,
  ScrollText,
  FileBadge,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Forest / lime gradient chips — matches Obscura launch palette */
export type ObscuraChipTone = "forest" | "lime" | "deep" | "moss";

const CHIP_TONE: Record<ObscuraChipTone, string> = {
  forest: "chip-forest",
  lime: "chip-lime",
  deep: "chip-deep",
  moss: "chip-moss",
};

const SIZE = {
  sm: { box: "size-9", icon: "size-4" },
  md: { box: "size-11", icon: "size-5" },
  lg: { box: "size-12", icon: "size-5" },
} as const;

export function ObscuraFeatureIcon({
  icon: Icon,
  tone = "forest",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: ObscuraChipTone;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const s = SIZE[size];
  return (
    <div
      className={cn("chip-icon shrink-0", s.box, CHIP_TONE[tone], className)}
      aria-hidden
    >
      <Icon className={s.icon} strokeWidth={1.75} />
    </div>
  );
}

/** How-it-works steps */
export const ENCRYPTION_STEP_ICONS: { icon: LucideIcon; tone: ObscuraChipTone }[] = [
  { icon: Binary, tone: "forest" },
  { icon: CircuitBoard, tone: "lime" },
  { icon: FileSignature, tone: "moss" },
  { icon: GlobeLock, tone: "deep" },
];

/** Security pillars */
export const SECURITY_PILLAR_ICONS: { icon: LucideIcon; tone: ObscuraChipTone }[] = [
  { icon: CircuitBoard, tone: "forest" },
  { icon: FileSignature, tone: "lime" },
  { icon: ShieldCheck, tone: "deep" },
];

/** Product modules */
export const PRODUCT_MODULE_ICONS: { icon: LucideIcon; tone: ObscuraChipTone }[] = [
  { icon: Banknote, tone: "forest" },
  { icon: Landmark, tone: "lime" },
  { icon: Vote, tone: "deep" },
];

/** Logo strip / trust traits */
export const TRAIT_ICONS = {
  audit: ShieldCheck,
  permit: FileSignature,
  zk: Binary,
  biometric: Fingerprint,
  threshold: Layers,
  view: ScanEye,
  whitepaper: ScrollText,
  bounty: FileBadge,
} as const;

export const TRAIT_TONES: ObscuraChipTone[] = ["forest", "lime", "deep", "moss", "forest", "lime"];
