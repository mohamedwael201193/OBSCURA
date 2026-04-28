import { expect } from "chai";
import { ethers } from "hardhat";

describe("ObscuraSocialResolver", function () {
  let resolver: any;
  let verifier: any;
  let alice: any;
  let bob: any;

  beforeEach(async function () {
    [verifier, alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ObscuraSocialResolver");
    resolver = await F.deploy(verifier.address);
    await resolver.waitForDeployment();
  });

  function fakeKeys() {
    return {
      spend: ethers.keccak256(ethers.toUtf8Bytes("spend")),
      view: ethers.keccak256(ethers.toUtf8Bytes("view")),
    };
  }

  it("rejects empty/long handles", async function () {
    const k = fakeKeys();
    await expect(
      resolver.connect(alice).selfRegister("", k.spend, k.view, 2, 3)
    ).to.be.revertedWithCustomError(resolver, "HandleEmpty");
    const long = "x".repeat(64);
    await expect(
      resolver.connect(alice).selfRegister(long, k.spend, k.view, 2, 3)
    ).to.be.revertedWithCustomError(resolver, "HandleTooLong");
  });

  it("self-register works once and is FCFS", async function () {
    const k = fakeKeys();
    await expect(resolver.connect(alice).selfRegister("alice", k.spend, k.view, 2, 3))
      .to.emit(resolver, "HandleRegistered");
    await expect(
      resolver.connect(bob).selfRegister("alice", k.spend, k.view, 2, 3)
    ).to.be.revertedWithCustomError(resolver, "AlreadyRegistered");
  });

  it("resolve returns the registered record", async function () {
    const k = fakeKeys();
    await resolver.connect(alice).selfRegister("alice", k.spend, k.view, 2, 3);
    const r = await resolver.resolve("alice");
    expect(r[0]).to.equal(alice.address);
    expect(r[1]).to.equal(k.spend);
    expect(r[2]).to.equal(k.view);
    expect(r[5]).to.equal(true); // selfClaimed
  });

  it("resolve reverts on unknown handle", async function () {
    await expect(resolver.resolve("nobody")).to.be.revertedWithCustomError(
      resolver,
      "HandleEmpty"
    );
  });

  it("only owner can update meta", async function () {
    const k = fakeKeys();
    await resolver.connect(alice).selfRegister("alice", k.spend, k.view, 2, 3);
    const k2 = {
      spend: ethers.keccak256(ethers.toUtf8Bytes("spend2")),
      view: ethers.keccak256(ethers.toUtf8Bytes("view2")),
    };
    await expect(
      resolver.connect(bob).updateMeta("alice", k2.spend, k2.view, 2, 3)
    ).to.be.revertedWithCustomError(resolver, "NotOwner");
    await resolver.connect(alice).updateMeta("alice", k2.spend, k2.view, 2, 3);
    const r = await resolver.resolve("alice");
    expect(r[1]).to.equal(k2.spend);
  });

  it("transferHandle moves ownership", async function () {
    const k = fakeKeys();
    await resolver.connect(alice).selfRegister("alice", k.spend, k.view, 2, 3);
    await resolver.connect(alice).transferHandle("alice", bob.address);
    const r = await resolver.resolve("alice");
    expect(r[0]).to.equal(bob.address);
    await expect(
      resolver.connect(alice).updateMeta("alice", k.spend, k.view, 2, 3)
    ).to.be.revertedWithCustomError(resolver, "NotOwner");
  });

  it("registerWithEnsProof verifies signature", async function () {
    const k = fakeKeys();
    const handleHash = ethers.keccak256(ethers.toUtf8Bytes("alice.eth"));
    const digest = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "bytes32", "address"],
        ["OBSCURA_ENS_PROOF_V1", handleHash, alice.address]
      )
    );
    const sig = await verifier.signMessage(ethers.getBytes(digest));

    await expect(
      resolver
        .connect(alice)
        .registerWithEnsProof("alice.eth", k.spend, k.view, 2, 3, sig)
    ).to.emit(resolver, "HandleRegistered");
    const r = await resolver.resolve("alice.eth");
    expect(r[5]).to.equal(false); // selfClaimed=false (ENS-backed)
  });

  it("registerWithEnsProof rejects bad signer", async function () {
    const k = fakeKeys();
    const handleHash = ethers.keccak256(ethers.toUtf8Bytes("bob.eth"));
    const digest = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "bytes32", "address"],
        ["OBSCURA_ENS_PROOF_V1", handleHash, alice.address]
      )
    );
    // signed by alice (not the verifier)
    const sig = await alice.signMessage(ethers.getBytes(digest));
    await expect(
      resolver
        .connect(alice)
        .registerWithEnsProof("bob.eth", k.spend, k.view, 2, 3, sig)
    ).to.be.revertedWithCustomError(resolver, "InvalidEnsProof");
  });
});
