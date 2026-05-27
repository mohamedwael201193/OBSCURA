import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Hex } from "viem";

import {
  CURRENT_PAYMASTER_ADDRESS,
  CURRENT_WEB_AUTHN_SMART_ACCOUNT_FACTORY,
  assertPrivateFheWalletExecution,
  resolvePaymentExecutionMode,
  resolvePaymasterAddress,
  resolveSmartAccountFactory,
  resolveUnifiedWriteRoute,
} from "@/lib/payExecutionPolicy";
import { submitUserOp, type PackedUserOperation } from "@/lib/userop";

const testDir = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(testDir, "..");
const workspaceRoot = resolve(sourceRoot, "..", "..", "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(sourceRoot, relativePath), "utf8");
}

function readWorkspace(relativePath: string): string {
  return readFileSync(resolve(workspaceRoot, relativePath), "utf8");
}

function makeOperation(): PackedUserOperation {
  return {
    sender: `0x${"11".repeat(20)}` as Hex,
    nonce: 0n,
    initCode: "0x",
    callData: "0x",
    accountGasLimits: `0x${"00".repeat(32)}` as Hex,
    preVerificationGas: 0n,
    gasFees: `0x${"00".repeat(32)}` as Hex,
    paymasterAndData: "0x",
    signature: "0x",
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Pay P0.3 execution policy", () => {
  it("uses the final WebAuthn factory and rejects deprecated factory envs", () => {
    expect(resolveSmartAccountFactory(undefined)).toBe(CURRENT_WEB_AUTHN_SMART_ACCOUNT_FACTORY);
    expect(resolveSmartAccountFactory("0xbe8dC1d4Dcc368e0dBb6c7A5BDFfac2Fe72AFd05")).toBe(
      CURRENT_WEB_AUTHN_SMART_ACCOUNT_FACTORY,
    );
    expect(resolveSmartAccountFactory("0x1736e58add613c9dc1b4576681e48918ecf37f51")).toBe(
      CURRENT_WEB_AUTHN_SMART_ACCOUNT_FACTORY,
    );
  });

  it("keeps the frontend paymaster default aligned to v2", () => {
    expect(resolvePaymasterAddress(undefined)).toBe(CURRENT_PAYMASTER_ADDRESS);
    expect(resolvePaymasterAddress("not-an-address")).toBe(CURRENT_PAYMASTER_ADDRESS);
    expect(readWorkspace("render.yaml")).toContain(`value: "${CURRENT_PAYMASTER_ADDRESS}"`);
  });

  it("keeps Private Mode on wallet execution even when smart account is ready", () => {
    expect(resolvePaymentExecutionMode("private", true)).toBe("wallet");
    expect(resolvePaymentExecutionMode("public", true)).toBe("smart");
    expect(resolvePaymentExecutionMode("public", false)).toBe("wallet");
    expect(() => assertPrivateFheWalletExecution("smart")).toThrow("Public Mode cannot send encrypted ocUSDC");
  });

  it("throws instead of silently falling back when smart execution is requested but unavailable", () => {
    expect(() =>
      resolveUnifiedWriteRoute({ preferSmart: true, isDeployed: false, accountAddress: null }),
    ).toThrow("Smart account is not ready");
    expect(resolveUnifiedWriteRoute({ preferSmart: false, isDeployed: false, accountAddress: null })).toBe("eoa");
    expect(resolveUnifiedWriteRoute({ preferSmart: true, isDeployed: true, accountAddress: "0xabc" })).toBe(
      "smart-account",
    );
  });

  it("requires a successful UserOp receipt before reporting success", async () => {
    const userOpHash = `0x${"ab".repeat(32)}` as Hex;
    const bundleHash = `0x${"cd".repeat(32)}` as Hex;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ userOpHash }))
      .mockResolvedValueOnce(jsonResponse({
        receipt: {
          userOpHash,
          success: false,
          reason: "execution reverted",
          receipt: { transactionHash: bundleHash, status: "reverted" },
        },
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitUserOp(makeOperation())).rejects.toThrow("Smart account execution failed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("Pay P0.4 privacy gates", () => {
  it("keeps private send source free of smart-account submission", () => {
    const source = readSource("components/pay-v4/UnifiedSendForm.tsx");
    expect(source).not.toContain("sendUserOp(");
    expect(source).not.toContain("confidentialTransferFrom");
  });

  it("keeps private Pay management writes wallet-only", () => {
    expect(readSource("components/pay-v4/StakePoolForm.tsx")).toContain('mode: "eoa"');
    expect(readSource("components/pay-v4/AuditorGrantPanel.tsx")).toContain('mode: "eoa"');
    expect(readSource("components/pay-v4/ResolverManager.tsx")).toContain('mode: "eoa"');
    expect(readSource("components/pay-v4/StreamList.tsx")).toContain('mode: "eoa"');
  });

  it("does not expose implementation jargon in active Pay UI copy", () => {
    const activePaySources = [
      "components/pay-v4/UnifiedSendForm.tsx",
      "components/pay-v4/PublicUSDCSendForm.tsx",
      "components/pay-v4/ClaimEscrowCard.tsx",
      "components/harmony/PayHarmonyHome.tsx",
      "components/harmony/PaymentModeBar.tsx",
      "components/pay-v4/OcUSDCPanel.tsx",
    ].map(readSource).join("\n");

    for (const forbiddenPhrase of [
      "Passkey UserOps",
      "sponsored UserOp",
      "FHE coprocessor",
      "decryption permit",
      "FHE silent-failure",
    ]) {
      expect(activePaySources).not.toContain(forbiddenPhrase);
    }
  });

  it("keeps push and email notification bodies amount-free", () => {
    const notificationSources = [
      readWorkspace("backend/obscura-api/src/notifications.ts"),
      readWorkspace("backend/obscura-worker/src/notifications.ts"),
    ].join("\n");

    expect(notificationSources).toContain("Activity detected for");
    expect(notificationSources).toContain("Test notification for");
    expect(notificationSources).not.toMatch(/body:\s*`[^`]*(amount|USDC|ocUSDC|memo|label|recipient)/i);
  });

  it("keeps activity reads scoped to wallet participants", () => {
    const source = readSource("hooks/useActivityFeed.ts");
    expect(source).toContain('.contains("participants", [wallet])');
    expect(source).toContain("participants.includes(wallet)");
  });
});

describe("Pay P0.5/P1.1/P1.2 stabilization gates", () => {
  it("defines the shared reputation table with RLS, grants, and idempotency", () => {
    const migration = readWorkspace("backend/obscura-worker/migrations/002_create_reputation_events.sql");

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS obscura_reputation_events");
    expect(migration).toContain("source_app IN ('pay', 'credit', 'vote')");
    expect(migration).toContain("UNIQUE (wallet, source_app, signal_type, event_ref)");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("GRANT SELECT ON obscura_reputation_events TO anon, authenticated");
    expect(migration).toContain("REVOKE INSERT, UPDATE, DELETE ON obscura_reputation_events FROM anon, authenticated");
  });

  it("derives Pay reputation without raw amounts, notes, labels, or decrypted values", () => {
    const reputationSource = readWorkspace("backend/obscura-worker/src/reputation.ts");

    for (const signalType of [
      "private_payment_sent",
      "private_payment_received",
      "stream_cycle_settled",
      "escrow_redeemed",
      "invoice_paid",
      "subscription_consumed",
    ]) {
      expect(reputationSource).toContain(signalType);
    }
    expect(reputationSource).toContain("obscura_reputation_events");
    expect(reputationSource).not.toMatch(/activity\.args\.(amount|encryptedAmount|note|memo|label|recipientLabel)/i);
    expect(reputationSource).not.toMatch(/decrypt|decryptForView|getOrCreateSelfPermit/i);
  });

  it("keeps reputation inserts non-fatal to indexing and exposes aggregate-only API reads", () => {
    const indexerSource = readWorkspace("backend/obscura-worker/src/indexer/index.ts");
    const apiSource = readWorkspace("backend/obscura-api/src/reputation.ts");

    expect(indexerSource).toContain("insertReputationSignalsForActivity(activity)");
    expect(indexerSource).toContain("reputation signal error");
    expect(apiSource).toContain("totalCappedWeight");
    expect(apiSource).toContain("tierFor");
    expect(apiSource).not.toContain("event_ref");
  });

  it("keeps Settings reachable in mobile Pay navigation", () => {
    const shellSource = readSource("components/harmony/HarmonyAppShell.tsx");

    expect(shellSource).not.toContain("sidebar.slice(0, 5)");
    expect(shellSource).toContain("sidebar.map");
    expect(shellSource).toContain("truncate");
  });

  it("keeps service worker updates prompt and backwards-compatible", () => {
    const mainSource = readSource("main.tsx");
    const workerSource = readWorkspace("frontend/obscura-os-main/public/sw.js");

    expect(mainSource).toContain("registration.update()");
    expect(mainSource).toContain("SKIP_WAITING");
    expect(mainSource).toContain("OBSCURA_PUSH_RECEIVED");
    expect(workerSource).toContain("nestedData.url");
    expect(workerSource).toContain("data.clickUrl");
    expect(workerSource).toContain("pay-final-p1-3");
    expect(workerSource).toContain("requireInteraction");
    expect(workerSource).toContain("OBSCURA_SHOW_NOTIFICATION");
    expect(workerSource).toContain("sameOriginClient.navigate");
    expect(workerSource).toContain("clients.claim()");
  });

  it("keeps notification setup permission-aware and uses real browser display checks", () => {
    const hookSource = readSource("hooks/useNotificationPrefs.ts");
    const paySource = readSource("pages/PayPage.tsx");

    expect(hookSource).toContain("Notification.requestPermission()");
    expect(hookSource).toContain("registration.showNotification");
    expect(hookSource).toContain("serviceWorkerReady");
    expect(paySource).toContain("Browser notification displayed");
    expect(paySource).toContain("Browser permission");
  });

  it("keeps stealth inbox scans behind explicit session unlock", () => {
    const scanSource = readSource("hooks/useStealthScan.ts");
    const inboxSource = readSource("hooks/useStealthInbox.ts");
    const inboxUiSource = readSource("components/pay-v4/StealthInboxV2.tsx");
    const keystoreSource = readSource("lib/keystore.ts");

    expect(scanSource).toContain("Unlock inbox to scan private announcements");
    expect(scanSource).toContain("obscura_activity");
    expect(scanSource).toContain("ObscuraStealthRegistry.Announcement");
    expect(scanSource).toContain("RPC_CHUNK_BLOCKS");
    expect(inboxSource).toContain("if (!address || !scan.isUnlocked) return");
    expect(inboxSource).toContain("unlockInbox");
    expect(inboxSource).toContain("lockInbox");
    expect(inboxUiSource).toContain("Unlock inbox");
    expect(inboxUiSource).toContain("Lock");
    expect(keystoreSource).toContain("sessionStorage");
  });

  it("extends production smoke checks to reputation deployment health", () => {
    const smokeScript = readWorkspace("scripts/test-e2e.ps1");

    expect(smokeScript).toContain("obscura_reputation_events");
    expect(smokeScript).toContain("/reputation/0x0000000000000000000000000000000000000001");
    expect(smokeScript).toContain("pay-final-p1-3");
  });
});