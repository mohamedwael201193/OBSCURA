import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Signer } from "ethers";

// ─── Signing helper ───────────────────────────────────────────────────────────
// Signs hash with Ethereum personal_sign prefix (matches contract _validateEOA).
// Returns: 0x00 + r(32) + s(32)  — 65 bytes, type-prefixed for the contract.
async function signEOA(signer: Signer, hash: string): Promise<string> {
  const rawSig = await signer.signMessage(ethers.getBytes(hash));
  const r = rawSig.slice(2, 66);
  const s = rawSig.slice(66, 130);
  return "0x00" + r + s;
}

describe("ObscuraSmartAccount", () => {
  const ENTRY_POINT = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
  let owner: Signer;
  let other: Signer;
  let governance: Signer;
  let ownerAddr: string;
  let otherAddr: string;
  let governanceAddr: string;

  let factory: any;
  let paymaster: any;
  let mockTarget: any;

  before(async () => {
    [owner, other, governance] = await ethers.getSigners();
    ownerAddr = await owner.getAddress();
    otherAddr = await other.getAddress();
    governanceAddr = await governance.getAddress();

    const Factory = await ethers.getContractFactory("ObscuraSmartAccountFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    const Paymaster = await ethers.getContractFactory("ObscuraPaymaster");
    paymaster = await Paymaster.deploy(governanceAddr);
    await paymaster.waitForDeployment();

    const MockTarget = await ethers.getContractFactory("MockCallTarget");
    mockTarget = await MockTarget.deploy();
    await mockTarget.waitForDeployment();
  });

  // ─── Factory ──────────────────────────────────────────────────────────────
  describe("ObscuraSmartAccountFactory", () => {
    it("deploys account at deterministic address (EOA owner)", async () => {
      const salt = 7n;
      const predicted = await factory.getAccountAddress(ownerAddr, 0n, 0n, salt);

      const tx = await factory.createAccount(ownerAddr, 0n, 0n, salt);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l: any) => {
          try { return factory.interface.parseLog(l); } catch { return null; }
        })
        .find((e: any) => e?.name === "AccountCreated");

      expect(event).to.not.be.null;
      const deployedAddr = event!.args.account;
      expect(deployedAddr.toLowerCase()).to.equal(predicted.toLowerCase());
    });

    it("getAddress is deterministic for same params", async () => {
      const salt = 8n;
      const addr1 = await factory.getAccountAddress(ownerAddr, 0n, 0n, salt);
      const addr2 = await factory.getAccountAddress(ownerAddr, 0n, 0n, salt);
      expect(addr1).to.equal(addr2);
    });

    it("different salts produce different addresses", async () => {
      const addr1 = await factory.getAccountAddress(ownerAddr, 0n, 0n, 100n);
      const addr2 = await factory.getAccountAddress(ownerAddr, 0n, 0n, 101n);
      expect(addr1).to.not.equal(addr2);
    });

    it("different owners produce different addresses", async () => {
      const addr1 = await factory.getAccountAddress(ownerAddr, 0n, 0n, 0n);
      const addr2 = await factory.getAccountAddress(otherAddr, 0n, 0n, 0n);
      expect(addr1).to.not.equal(addr2);
    });

    it("re-create with same salt does not revert (idempotent)", async () => {
      const salt = 9n;
      await (await factory.createAccount(ownerAddr, 0n, 0n, salt)).wait();
      await expect(factory.createAccount(ownerAddr, 0n, 0n, salt)).to.not.be.reverted;
    });

    it("reverts if both owner and passkeyX are zero", async () => {
      await expect(
        factory.createAccount(ethers.ZeroAddress, 0n, 0n, 42n)
      ).to.be.revertedWith("ObscuraSmartAccountFactory: zero owner and passkey");
    });

    it("account has code at predicted address after deployment", async () => {
      const salt = 200n;
      const predicted = await factory.getAccountAddress(ownerAddr, 0n, 0n, salt);
      expect((await ethers.provider.getCode(predicted))).to.equal("0x");
      await (await factory.createAccount(ownerAddr, 0n, 0n, salt)).wait();
      const code = await ethers.provider.getCode(predicted);
      expect(code.length).to.be.greaterThan(2);
    });
  });

  // ─── SmartAccount ─────────────────────────────────────────────────────────
  describe("ObscuraSmartAccount", () => {
    let account: any;
    let accountAddr: string;

    beforeEach(async () => {
      const Account = await ethers.getContractFactory("ObscuraSmartAccount");
      account = await Account.deploy(ownerAddr, 0n, 0n);
      await account.waitForDeployment();
      accountAddr = await account.getAddress();
      await owner.sendTransaction({ to: accountAddr, value: ethers.parseEther("1") });
    });

    it("stores owner correctly", async () => {
      expect(await account.owner()).to.equal(ownerAddr);
    });

    it("passkey starts disabled for EOA-only account", async () => {
      expect(await account.passkeyEnabled()).to.equal(false);
    });

    it("ENTRY_POINT is correct v0.7 address", async () => {
      expect(await account.ENTRY_POINT()).to.equal("0x0000000071727De22E5E9d8BAf0edAc6f37da032");
    });

    it("P256_VERIFIER is the RIP-7212 precompile address", async () => {
      expect(await account.P256_VERIFIER()).to.equal("0x0000000000000000000000000000000000000100");
    });

    it("execute reverts from non-owner non-EntryPoint", async () => {
      await expect(
        account.connect(other).execute(accountAddr, 0n, "0x")
      ).to.be.revertedWithCustomError(account, "NotOwnerOrEntryPoint");
    });

    it("owner can call execute directly", async () => {
      await expect(account.connect(owner).execute(accountAddr, 0n, "0x")).to.not.be.reverted;
    });

    it("owner can send ETH via execute", async () => {
      const balBefore = await ethers.provider.getBalance(otherAddr);
      await account.connect(owner).execute(otherAddr, ethers.parseEther("0.1"), "0x");
      const balAfter = await ethers.provider.getBalance(otherAddr);
      expect(balAfter - balBefore).to.equal(ethers.parseEther("0.1"));
    });

    it("executeBatch reverts on array mismatch", async () => {
      await expect(
        account.connect(owner).executeBatch([accountAddr], [0n, 0n], ["0x"])
      ).to.be.revertedWith("Array mismatch");
    });

    it("executeBatch reverts on oversized batch (>16)", async () => {
      const addrs = new Array(17).fill(accountAddr);
      await expect(
        account.connect(owner).executeBatch(addrs, new Array(17).fill(0n), new Array(17).fill("0x"))
      ).to.be.revertedWith("Batch too large");
    });

    it("executeBatch succeeds for valid batch", async () => {
      await expect(
        account.connect(owner).executeBatch([accountAddr, accountAddr], [0n, 0n], ["0x", "0x"])
      ).to.not.be.reverted;
    });

    it("updateOwner changes owner", async () => {
      await account.connect(owner).updateOwner(otherAddr);
      expect(await account.owner()).to.equal(otherAddr);
    });

    it("updateOwner reverts for zero address", async () => {
      await expect(
        account.connect(owner).updateOwner(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(account, "ZeroAddress");
    });

    it("updatePasskey enables passkey", async () => {
      await account.connect(owner).updatePasskey(1234n, 5678n);
      expect(await account.passkeyEnabled()).to.equal(true);
      expect(await account.passkeyX()).to.equal(1234n);
    });

    it("updatePasskey with x=0 disables passkey", async () => {
      await account.connect(owner).updatePasskey(123n, 456n);
      await account.connect(owner).updatePasskey(0n, 0n);
      expect(await account.passkeyEnabled()).to.equal(false);
    });

    it("isValidSignature returns 0xffffffff for empty signature", async () => {
      expect(await account.isValidSignature(ethers.keccak256("0x1234"), "0x")).to.equal("0xffffffff");
    });

    it("isValidSignature returns 0x1626ba7e for valid EOA sig", async () => {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-erc1271"));
      const sig = await signEOA(owner, hash);
      expect(await account.isValidSignature(hash, sig)).to.equal("0x1626ba7e");
    });

    it("isValidSignature returns 0xffffffff for wrong signer", async () => {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-erc1271"));
      const sig = await signEOA(other, hash);
      expect(await account.isValidSignature(hash, sig)).to.equal("0xffffffff");
    });

    it("isValidSignature returns 0xffffffff for P-256 sig when passkey disabled", async () => {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-p256"));
      const sig = "0x01" + "bb".repeat(64);
      expect(await account.isValidSignature(hash, sig)).to.equal("0xffffffff");
    });

    it("prevents re-entrant execute calls", async () => {
      const ReentrantAttacker = await ethers.getContractFactory("ReentrantAttacker");
      const attacker = await ReentrantAttacker.deploy(accountAddr);
      await attacker.waitForDeployment();
      await owner.sendTransaction({ to: await attacker.getAddress(), value: ethers.parseEther("0.1") });
      await expect(
        account.connect(owner).execute(
          await attacker.getAddress(),
          0n,
          attacker.interface.encodeFunctionData("attack")
        )
      ).to.be.revertedWithCustomError(account, "ExecutionFailed");
    });
  });

  // ─── Paymaster ────────────────────────────────────────────────────────────
  describe("ObscuraPaymaster", () => {
    let entryPoint: Signer;
    let accountIface: any;

    before(async () => {
      await paymaster.connect(governance).whitelistTarget(await mockTarget.getAddress(), true);
      await network.provider.request({ method: "hardhat_impersonateAccount", params: [ENTRY_POINT] });
      await network.provider.request({
        method: "hardhat_setBalance",
        params: [ENTRY_POINT, "0x3635C9ADC5DEA00000"],
      });
      entryPoint = await ethers.getSigner(ENTRY_POINT);
      const Account = await ethers.getContractFactory("ObscuraSmartAccount");
      accountIface = Account.interface;
    });

    const baseUserOp = (callData: string) => ({
      sender: ownerAddr, nonce: 0n, initCode: "0x", callData,
      accountGasLimits: ethers.ZeroHash, preVerificationGas: 0n,
      gasFees: ethers.ZeroHash, paymasterAndData: "0x", signature: "0x",
    });

    it("stores governance correctly", async () => {
      expect(await paymaster.governance()).to.equal(governanceAddr);
    });

    it("ENTRY_POINT is correct", async () => {
      expect(await paymaster.ENTRY_POINT()).to.equal("0x0000000071727De22E5E9d8BAf0edAc6f37da032");
    });

    it("whitelistTarget adds/removes target", async () => {
      const addr = await mockTarget.getAddress();
      expect(await paymaster.whitelistedTargets(addr)).to.equal(true);
      await paymaster.connect(governance).whitelistTarget(addr, false);
      expect(await paymaster.whitelistedTargets(addr)).to.equal(false);
      await paymaster.connect(governance).whitelistTarget(addr, true);
    });

    it("whitelistTarget reverts for zero address", async () => {
      await expect(
        paymaster.connect(governance).whitelistTarget(ethers.ZeroAddress, true)
      ).to.be.revertedWithCustomError(paymaster, "ZeroAddress");
    });

    it("whitelistTarget reverts from non-governance", async () => {
      await expect(
        paymaster.connect(other).whitelistTarget(await mockTarget.getAddress(), true)
      ).to.be.revertedWithCustomError(paymaster, "NotGovernance");
    });

    it("validatePaymasterUserOp reverts from non-EntryPoint", async () => {
      const op = {
        sender: ownerAddr, nonce: 0n, initCode: "0x", callData: "0x",
        accountGasLimits: ethers.ZeroHash, preVerificationGas: 0n,
        gasFees: ethers.ZeroHash, paymasterAndData: "0x", signature: "0x",
      };
      await expect(
        paymaster.connect(owner).validatePaymasterUserOp(op, ethers.ZeroHash, 0n)
      ).to.be.revertedWithCustomError(paymaster, "NotEntryPoint");
    });

    it("validatePaymasterUserOp allows whitelisted execute target", async () => {
      const callData = accountIface.encodeFunctionData("execute", [await mockTarget.getAddress(), 0n, "0x"]);
      await expect(
        paymaster.connect(entryPoint).validatePaymasterUserOp.staticCall(baseUserOp(callData), ethers.ZeroHash, 1n)
      ).to.not.be.reverted;
    });

    it("validatePaymasterUserOp rejects unwhitelisted execute target", async () => {
      const callData = accountIface.encodeFunctionData("execute", [otherAddr, 0n, "0x"]);
      await expect(
        paymaster.connect(entryPoint).validatePaymasterUserOp.staticCall(baseUserOp(callData), ethers.ZeroHash, 1n)
      ).to.be.revertedWithCustomError(paymaster, "TargetNotWhitelisted").withArgs(otherAddr);
    });

    it("validatePaymasterUserOp allows executeBatch when every target is whitelisted", async () => {
      const target = await mockTarget.getAddress();
      const callData = accountIface.encodeFunctionData("executeBatch", [[target, target], [0n, 0n], ["0x", "0x"]]);
      await expect(
        paymaster.connect(entryPoint).validatePaymasterUserOp.staticCall(baseUserOp(callData), ethers.ZeroHash, 1n)
      ).to.not.be.reverted;
    });

    it("validatePaymasterUserOp rejects executeBatch with an unwhitelisted target", async () => {
      const target = await mockTarget.getAddress();
      const callData = accountIface.encodeFunctionData("executeBatch", [[target, otherAddr], [0n, 0n], ["0x", "0x"]]);
      await expect(
        paymaster.connect(entryPoint).validatePaymasterUserOp.staticCall(baseUserOp(callData), ethers.ZeroHash, 1n)
      ).to.be.revertedWithCustomError(paymaster, "TargetNotWhitelisted").withArgs(otherAddr);
    });

    it("postOp reverts from non-EntryPoint", async () => {
      await expect(paymaster.connect(owner).postOp(0, "0x", 0n, 0n))
        .to.be.revertedWithCustomError(paymaster, "NotEntryPoint");
    });

    it("withdraw reverts from non-governance", async () => {
      await expect(paymaster.connect(other).withdraw(otherAddr, 1n))
        .to.be.revertedWithCustomError(paymaster, "NotGovernance");
    });

    it("userOpsRemaining returns MAX for fresh user", async () => {
      expect(await paymaster.userOpsRemaining(otherAddr)).to.equal(20n);
    });

    it("setSigGate reverts with enabled + zero signer", async () => {
      await expect(paymaster.connect(governance).setSigGate(true, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(paymaster, "InvalidSigGate");
    });

    it("setSigGate enables and disables correctly", async () => {
      await paymaster.connect(governance).setSigGate(true, ownerAddr);
      expect(await paymaster.sigGateEnabled()).to.equal(true);
      await paymaster.connect(governance).setSigGate(false, ethers.ZeroAddress);
      expect(await paymaster.sigGateEnabled()).to.equal(false);
    });

    it("proposeGovernance + acceptGovernance transfers governance", async () => {
      await paymaster.connect(governance).proposeGovernance(otherAddr);
      expect(await paymaster.pendingGovernance()).to.equal(otherAddr);
      await paymaster.connect(other).acceptGovernance();
      expect(await paymaster.governance()).to.equal(otherAddr);
      // Restore
      await paymaster.connect(other).proposeGovernance(governanceAddr);
      await paymaster.connect(governance).acceptGovernance();
      expect(await paymaster.governance()).to.equal(governanceAddr);
    });

    it("proposeGovernance reverts for zero address", async () => {
      await expect(paymaster.connect(governance).proposeGovernance(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(paymaster, "ZeroAddress");
    });

    it("acceptGovernance reverts if not pending governance", async () => {
      await paymaster.connect(governance).proposeGovernance(otherAddr);
      await expect(paymaster.connect(owner).acceptGovernance())
        .to.be.revertedWithCustomError(paymaster, "NotGovernance");
      // Clean up
      await paymaster.connect(other).acceptGovernance();
      await paymaster.connect(other).proposeGovernance(governanceAddr);
      await paymaster.connect(governance).acceptGovernance();
    });
  });
});
