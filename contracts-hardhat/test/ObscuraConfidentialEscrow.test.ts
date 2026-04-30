import { expect } from "chai";
import { ethers } from "hardhat";

// Structural tests for ObscuraConfidentialEscrow.
//
// FHE-heavy paths (create/fund/redeem with real ciphertext) require the
// cofhe-mocks runtime which is not configured for this contract suite.
// These tests verify deployable surface, immutables, auth, and revert
// strings — full FHE flow is exercised by the on-chain smoke test
// against deployed Arbitrum Sepolia contracts.

describe("ObscuraConfidentialEscrow", function () {
  let escrow: any;
  let deployer: any;
  let alice: any;
  let bob: any;

  // Use real deployed cUSDC address as constructor arg — tests just
  // verify wiring; no calls are made to it in these structural tests.
  const CUSDC = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";

  beforeEach(async function () {
    [deployer, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ObscuraConfidentialEscrow");
    escrow = await Factory.deploy(CUSDC);
    await escrow.waitForDeployment();
  });

  describe("Constructor", function () {
    it("stores cUSDC immutable", async function () {
      expect((await escrow.cUSDC()).toLowerCase()).to.equal(CUSDC.toLowerCase());
    });

    it("starts with zero escrows", async function () {
      expect(await escrow.getEscrowCount()).to.equal(0n);
      expect(await escrow.nextEscrowId()).to.equal(0n);
    });

    it("rejects zero cUSDC address", async function () {
      const Factory = await ethers.getContractFactory("ObscuraConfidentialEscrow");
      await expect(Factory.deploy(ethers.ZeroAddress)).to.be.revertedWith("cUSDC=0");
    });
  });

  describe("Views on missing escrow", function () {
    it("exists() returns false for unknown id", async function () {
      expect(await escrow.exists(0)).to.equal(false);
      expect(await escrow.exists(999)).to.equal(false);
    });

    it("isCancelled() returns false for unknown id", async function () {
      expect(await escrow.isCancelled(0)).to.equal(false);
    });

    it("getCreator() returns zero address for unknown id", async function () {
      expect(await escrow.getCreator(0)).to.equal(ethers.ZeroAddress);
    });

    it("getResolver() returns zero address for unknown id", async function () {
      expect(await escrow.getResolver(0)).to.equal(ethers.ZeroAddress);
    });

    it("getEscrowAmount() reverts for unknown id", async function () {
      await expect(escrow.getEscrowAmount(0)).to.be.revertedWith("no escrow");
    });

    it("getEscrowPaidAmount() reverts for unknown id", async function () {
      await expect(escrow.getEscrowPaidAmount(0)).to.be.revertedWith("no escrow");
    });

    it("getEscrowRedeemed() reverts for unknown id", async function () {
      await expect(escrow.getEscrowRedeemed(0)).to.be.revertedWith("no escrow");
    });

    it("getEscrowOwner() reverts for unknown id", async function () {
      await expect(escrow.getEscrowOwner(0)).to.be.revertedWith("no escrow");
    });
  });

  describe("Auth on non-existent escrow", function () {
    it("redeem() reverts with no escrow", async function () {
      await expect(escrow.connect(alice).redeem(0)).to.be.revertedWith("no escrow");
    });

    it("cancel() reverts with no escrow", async function () {
      await expect(escrow.connect(alice).cancel(0)).to.be.revertedWith("no escrow");
    });
  });

  describe("Events present in ABI", function () {
    it("declares all four lifecycle events", async function () {
      const frag = (name: string) => escrow.interface.getEvent(name);
      expect(frag("EscrowCreated")).to.not.equal(null);
      expect(frag("EscrowFunded")).to.not.equal(null);
      expect(frag("EscrowRedeemed")).to.not.equal(null);
      expect(frag("EscrowCancelled")).to.not.equal(null);
    });
  });

  describe("Public surface — selectors match plan", function () {
    it("exposes create / fund / redeem / cancel", async function () {
      const names = escrow.interface.fragments
        .filter((f: any) => f.type === "function")
        .map((f: any) => f.name);
      expect(names).to.include("create");
      expect(names).to.include("fund");
      expect(names).to.include("redeem");
      expect(names).to.include("cancel");
    });
  });
});
