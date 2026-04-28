import { expect } from "chai";
import { ethers } from "hardhat";

describe("ObscuraInboxIndex", function () {
  let idx: any;
  let alice: any;
  let bob: any;

  beforeEach(async function () {
    [alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ObscuraInboxIndex");
    idx = await F.deploy();
    await idx.waitForDeployment();
  });

  it("starts with empty filter", async function () {
    expect(await idx.isIgnored(alice.address, ethers.id("x"))).to.equal(false);
  });

  it("ignoreSender flips bits and emits", async function () {
    const h = ethers.id("spam-1");
    await expect(idx.connect(alice).ignoreSender(h))
      .to.emit(idx, "SenderIgnored")
      .withArgs(alice.address, h);
    expect(await idx.isIgnored(alice.address, h)).to.equal(true);
    // Bob's filter unaffected.
    expect(await idx.isIgnored(bob.address, h)).to.equal(false);
  });

  it("bulk ignore", async function () {
    const a = ethers.id("a");
    const b = ethers.id("b");
    const c = ethers.id("c");
    await idx.connect(alice).ignoreSenders([a, b, c]);
    expect(await idx.isIgnored(alice.address, a)).to.equal(true);
    expect(await idx.isIgnored(alice.address, b)).to.equal(true);
    expect(await idx.isIgnored(alice.address, c)).to.equal(true);
    expect(await idx.isIgnored(alice.address, ethers.id("d"))).to.equal(false);
  });

  it("resetFilter clears state", async function () {
    const h = ethers.id("y");
    await idx.connect(alice).ignoreSender(h);
    expect(await idx.isIgnored(alice.address, h)).to.equal(true);
    await expect(idx.connect(alice).resetFilter())
      .to.emit(idx, "FilterReset")
      .withArgs(alice.address);
    expect(await idx.isIgnored(alice.address, h)).to.equal(false);
  });
});
