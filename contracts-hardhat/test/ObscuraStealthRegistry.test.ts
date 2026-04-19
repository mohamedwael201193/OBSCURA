import { expect } from "chai";
import { ethers } from "hardhat";

describe("ObscuraStealthRegistry", function () {
  let reg: any;
  let alice: any;
  let bob: any;

  beforeEach(async function () {
    [alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ObscuraStealthRegistry");
    reg = await F.deploy();
    await reg.waitForDeployment();
  });

  it("publishes a meta-address and reads it back", async function () {
    const spending = "0x" + "02".repeat(33);
    const viewing = "0x" + "03".repeat(33);
    await expect(reg.connect(alice).setMetaAddress(spending, viewing))
      .to.emit(reg, "MetaAddressSet")
      .withArgs(alice.address, spending, viewing);

    const [s, v, ts] = await reg.getMetaAddress(alice.address);
    expect(s).to.equal(spending);
    expect(v).to.equal(viewing);
    expect(ts).to.be.gt(0);
    expect(await reg.hasMetaAddress(alice.address)).to.equal(true);
    expect(await reg.registeredCount()).to.equal(1);
  });

  it("rejects malformed key lengths", async function () {
    const bad = "0xdeadbeef";
    const ok = "0x" + "02".repeat(33);
    await expect(reg.connect(alice).setMetaAddress(bad, ok)).to.be.revertedWith("bad spending key");
    await expect(reg.connect(alice).setMetaAddress(ok, bad)).to.be.revertedWith("bad viewing key");
  });

  it("emits Announcement on stealth payment notification", async function () {
    const ephemeral = "0x" + "04".repeat(33);
    const stealthAddr = ethers.getAddress("0x000000000000000000000000000000000000beef");
    const meta = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [42]);
    await expect(
      reg.connect(bob).announce(stealthAddr, ephemeral, "0xab", meta)
    )
      .to.emit(reg, "Announcement")
      .withArgs(1, stealthAddr, bob.address, ephemeral, "0xab", meta);
  });
});
