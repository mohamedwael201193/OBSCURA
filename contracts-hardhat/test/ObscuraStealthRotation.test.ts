import { expect } from "chai";
import { ethers } from "hardhat";

describe("ObscuraStealthRotation", function () {
  let rot: any;
  let alice: any;
  let bob: any;

  beforeEach(async function () {
    [alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ObscuraStealthRotation");
    rot = await F.deploy();
    await rot.waitForDeployment();
  });

  function pk(seed: string): string {
    // 33-byte compressed key: 0x02 || keccak256(seed)
    return "0x02" + ethers.keccak256(ethers.toUtf8Bytes(seed)).slice(2);
  }

  it("currentMeta reverts when none registered", async function () {
    await expect(rot.currentMeta(alice.address)).to.be.revertedWithCustomError(
      rot,
      "NoMeta"
    );
    expect(await rot.hasMeta(alice.address)).to.equal(false);
  });

  it("rotate enforces 33-byte keys", async function () {
    await expect(
      rot.connect(alice).rotate("0x", "0x")
    ).to.be.revertedWithCustomError(rot, "EmptyKey");

    await expect(
      rot.connect(alice).rotate("0x0203", pk("v"))
    ).to.be.revertedWithCustomError(rot, "BadKeyLength");
  });

  it("first rotate registers and emits previousIndex sentinel", async function () {
    const s = pk("s1");
    const v = pk("v1");
    const tx = await rot.connect(alice).rotate(s, v);
    const rcpt = await tx.wait();
    const ev = rcpt!.logs
      .map((l: any) => {
        try {
          return rot.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((p: any) => p && p.name === "MetaRotated");
    expect(ev).to.not.equal(null);
    expect(ev!.args[0]).to.equal(alice.address);
    expect(ev!.args[1]).to.equal(0n);
    // previousIndex == type(uint256).max
    expect(ev!.args[2]).to.equal(ethers.MaxUint256);

    expect(await rot.hasMeta(alice.address)).to.equal(true);
    expect(await rot.historyLength(alice.address)).to.equal(1n);
    const cur = await rot.currentMeta(alice.address);
    expect(cur[0]).to.equal(s);
    expect(cur[1]).to.equal(v);
    expect(cur[3]).to.equal(0n);
  });

  it("subsequent rotates append and deactivate previous", async function () {
    await rot.connect(alice).rotate(pk("s1"), pk("v1"));
    await rot.connect(alice).rotate(pk("s2"), pk("v2"));
    await rot.connect(alice).rotate(pk("s3"), pk("v3"));

    expect(await rot.historyLength(alice.address)).to.equal(3n);

    const m0 = await rot.metaAt(alice.address, 0);
    const m1 = await rot.metaAt(alice.address, 1);
    const m2 = await rot.metaAt(alice.address, 2);
    expect(m0[3]).to.equal(false);
    expect(m1[3]).to.equal(false);
    expect(m2[3]).to.equal(true);

    const cur = await rot.currentMeta(alice.address);
    expect(cur[3]).to.equal(2n);
  });

  it("metaAt reverts on out-of-range", async function () {
    await rot.connect(alice).rotate(pk("s"), pk("v"));
    await expect(rot.metaAt(alice.address, 5)).to.be.revertedWithCustomError(
      rot,
      "IndexOutOfRange"
    );
  });

  it("registered list de-duplicates", async function () {
    await rot.connect(alice).rotate(pk("s"), pk("v"));
    await rot.connect(alice).rotate(pk("s2"), pk("v2"));
    await rot.connect(bob).rotate(pk("sb"), pk("vb"));
    expect(await rot.registeredCount()).to.equal(2n);
    expect(await rot.registeredAt(0)).to.equal(alice.address);
    expect(await rot.registeredAt(1)).to.equal(bob.address);
  });
});
