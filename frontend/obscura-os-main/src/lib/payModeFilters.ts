import type { PayPrivacyMode } from "@/contexts/PaymentModeContext";
import type { ActivityItem } from "@/hooks/useActivityFeed";
import type { Receipt } from "@/hooks/useReceipts";
import { USDC_ARB_SEPOLIA } from "@/config/pay";

type ReceiptMeta = Record<string, unknown> | undefined;

function metaString(meta: ReceiptMeta, key: string): string {
  const value = meta?.[key];
  return typeof value === "string" ? value : "";
}

export function getReceiptMode(receipt: Receipt): PayPrivacyMode {
  const mode = metaString(receipt.meta, "mode").toLowerCase();
  const token = metaString(receipt.meta, "token").toUpperCase();

  if (token === "USDC") return "public";
  if (mode.startsWith("public")) return "public";
  if (mode === "gasless" || mode === "smart-account") return "public";
  if (receipt.kind === "cross-chain-fund") return "public";

  return "private";
}

export function getReceiptToken(receipt: Receipt): "USDC" | "ocUSDC" {
  return getReceiptMode(receipt) === "public" ? "USDC" : "ocUSDC";
}

export function isReceiptEncrypted(receipt: Receipt): boolean {
  return getReceiptMode(receipt) === "private";
}

export function filterReceiptsByPrivacyMode(
  receipts: Receipt[],
  mode?: PayPrivacyMode,
): Receipt[] {
  if (!mode) return receipts;
  return receipts.filter((receipt) => getReceiptMode(receipt) === mode);
}

const PUBLIC_EVENT_HINTS = [
  "erc20.transfer",
  "usdc.transfer",
  "publicusdc",
  "public.usdc",
  "useroperation",
  "entrypoint.useroperationevent",
  "paymaster",
  "cctp",
  "messagereceived",
  "messagesent",
  "depositforburn",
];

export function getActivityMode(item: ActivityItem): PayPrivacyMode {
  const eventName = item.event_name.toLowerCase();
  const contractAddress = item.contract_address.toLowerCase();
  const usdcAddress = USDC_ARB_SEPOLIA?.toLowerCase();

  if (usdcAddress && contractAddress === usdcAddress) return "public";
  if (PUBLIC_EVENT_HINTS.some((hint) => eventName.includes(hint))) return "public";

  return "private";
}

export function filterActivityByPrivacyMode(
  items: ActivityItem[],
  mode: PayPrivacyMode,
): ActivityItem[] {
  return items.filter((item) => getActivityMode(item) === mode);
}