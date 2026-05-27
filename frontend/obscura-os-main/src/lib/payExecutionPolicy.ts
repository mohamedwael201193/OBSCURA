export type PaymentMode = "wallet" | "smart";
export type PayPrivacyMode = "public" | "private";
export type UnifiedWriteRoute = "eoa" | "smart-account";

export const CURRENT_WEB_AUTHN_SMART_ACCOUNT_FACTORY = "0xFaC683D8AB872cCf5eBfaE1659a9CD44C6FB4feB" as const;
export const CURRENT_PAYMASTER_ADDRESS = "0x7a8D880D9c5F88Ba8bd4435c450256628F66dd0C" as const;

export const SMART_FHE_TRANSFER_UNSUPPORTED_MESSAGE =
  "Public Mode cannot send encrypted ocUSDC. Encrypted amounts must be authorized by the wallet that owns them, so switch to Private Mode for this send.";

const DEPRECATED_SMART_ACCOUNT_FACTORIES = new Set([
  "0xbe8dc1d4dcc368e0dbb6c7a5bdffac2fe72afd05",
  "0x1736e58add613c9dc1b4576681e48918ecf37f51",
]);

function isHexAddress(value: string | undefined): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value ?? "");
}

export function isDeprecatedSmartAccountFactory(factory: string | undefined): boolean {
  return !!factory && DEPRECATED_SMART_ACCOUNT_FACTORIES.has(factory.toLowerCase());
}

export function resolveSmartAccountFactory(configuredFactory: string | undefined): `0x${string}` {
  const candidate = configuredFactory?.trim();
  if (isHexAddress(candidate) && !isDeprecatedSmartAccountFactory(candidate)) {
    return candidate;
  }
  return CURRENT_WEB_AUTHN_SMART_ACCOUNT_FACTORY;
}

export function resolvePaymasterAddress(configuredPaymaster: string | undefined): `0x${string}` {
  const candidate = configuredPaymaster?.trim();
  return isHexAddress(candidate) ? candidate : CURRENT_PAYMASTER_ADDRESS;
}

export function resolvePaymentExecutionMode(
  privacyMode: PayPrivacyMode,
  isSmartAvailable: boolean,
): PaymentMode {
  return privacyMode === "public" && isSmartAvailable ? "smart" : "wallet";
}

export function assertPrivateFheWalletExecution(paymentMode: PaymentMode): void {
  if (paymentMode === "smart") {
    throw new Error(SMART_FHE_TRANSFER_UNSUPPORTED_MESSAGE);
  }
}

export function resolveUnifiedWriteRoute({
  preferSmart,
  isDeployed,
  accountAddress,
}: {
  preferSmart: boolean;
  isDeployed: boolean;
  accountAddress: string | null | undefined;
}): UnifiedWriteRoute {
  const smartReady = preferSmart && isDeployed && !!accountAddress;
  if (preferSmart && !smartReady) {
    throw new Error("Smart account is not ready. Finish Smart Account setup before sending.");
  }
  return smartReady ? "smart-account" : "eoa";
}