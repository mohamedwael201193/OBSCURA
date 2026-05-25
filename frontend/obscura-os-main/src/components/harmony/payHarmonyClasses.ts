/** Shared Tailwind classes for Pay forms in the harmony (light editorial) workspace. */

export const payHarmony = {
  shell: "space-y-5",
  shellSm: "space-y-4",

  headerRow: "flex items-center gap-3",
  headerIcon: "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline",
  headerIconSm: "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted hairline",
  headerTitle: "font-display text-lg leading-tight text-foreground",
  headerSubtitle: "font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground",
  headerEyebrow: "text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground",

  body: "text-sm leading-relaxed text-muted-foreground",
  label: "font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground",

  card: "rounded-2xl hairline bg-card",
  cardPad: "rounded-2xl hairline bg-card p-5",
  cardInset: "rounded-xl hairline bg-muted/40 p-4",
  statCell: "rounded-xl hairline bg-card p-3 space-y-1",

  notice: "rounded-xl hairline bg-muted/50 p-3 text-sm text-muted-foreground",
  noticeAccent: "rounded-xl border border-accent/30 bg-accent/10 p-4",
  noticeWarn: "rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-amber-900",
  noticeError: "rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive",

  tabRow: "flex gap-1 rounded-full hairline bg-muted/60 p-1",
  tabBtn: "flex-1 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
  tabBtnActive: "flex-1 rounded-full bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm hairline",

  modeTile: "flex w-full items-center gap-4 rounded-xl hairline bg-card p-4 text-left transition-colors hover:bg-muted/50",
  modeTileActive: "flex w-full items-center gap-4 rounded-xl border border-accent/40 bg-accent/15 p-4 text-left",

  listRow: "flex items-center gap-3 rounded-xl hairline bg-card p-4",
  divider: "border-t border-border",

  iconMuted: "h-4 w-4 text-muted-foreground",
  iconAccent: "h-4 w-4 text-[hsl(var(--success))]",

  dropdown:
    "absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl hairline bg-card py-1 shadow-lg",
  dropdownItem:
    "block w-full border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/60",

  pillBtn:
    "inline-flex h-9 items-center gap-1.5 rounded-full hairline bg-card px-3 text-xs text-muted-foreground hover:bg-muted",
} as const;
