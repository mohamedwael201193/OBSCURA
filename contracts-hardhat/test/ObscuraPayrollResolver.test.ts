import { expect } from "chai";
import { ethers } from "hardhat";

describe("ObscuraPayrollResolver", function () {
  let resolver: any;
  let escrow: any;
  let employer: any;
  let approver: any;
  let stranger: any;

  beforeEach(async function () {
    [escrow, employer, approver, stranger] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ObscuraPayrollResolver");
    resolver = await F.deploy(escrow.address);
    await resolver.waitForDeployment();
  });

  it("rejects non-escrow caller", async function () {
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint64", "address", "address"],
      [Math.floor(Date.now() / 1000) + 60, employer.address, ethers.ZeroAddress]
    );
    await expect(resolver.connect(stranger).onConditionSet(1, data)).to.be.revertedWith(
      "only escrow"
    );
  });

  it("registers and gates on time", async function () {
    const release = (await ethers.provider.getBlock("latest"))!.timestamp + 100;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint64", "address", "address"],
      [release, employer.address, ethers.ZeroAddress]
    );
    await resolver.connect(escrow).onConditionSet(7, data);

    expect(await resolver.isConditionMet(7)).to.equal(false);

    await ethers.provider.send("evm_setNextBlockTimestamp", [release + 1]);
    await ethers.provider.send("evm_mine", []);

    expect(await resolver.isConditionMet(7)).to.equal(true);
  });

  it("employer can cancel before release", async function () {
    const release = (await ethers.provider.getBlock("latest"))!.timestamp + 1000;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint64", "address", "address"],
      [release, employer.address, ethers.ZeroAddress]
    );
    await resolver.connect(escrow).onConditionSet(8, data);

    await expect(resolver.connect(stranger).cancel(8)).to.be.revertedWithCustomError(
      resolver,
      "NotEmployer"
    );
    await resolver.connect(employer).cancel(8);

    await ethers.provider.send("evm_setNextBlockTimestamp", [release + 1]);
    await ethers.provider.send("evm_mine", []);
    expect(await resolver.isConditionMet(8)).to.equal(false);
  });

  it("approver gate blocks until signed", async function () {
    const release = (await ethers.provider.getBlock("latest"))!.timestamp + 5;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint64", "address", "address"],
      [release, employer.address, approver.address]
    );
    await resolver.connect(escrow).onConditionSet(9, data);

    await ethers.provider.send("evm_setNextBlockTimestamp", [release + 1]);
    await ethers.provider.send("evm_mine", []);

    expect(await resolver.isConditionMet(9)).to.equal(false);
    await resolver.connect(approver).approve(9);
    expect(await resolver.isConditionMet(9)).to.equal(true);
  });

  it("supports the IConditionResolver interface", async function () {
    // bytes4(keccak256("isConditionMet(uint256)")) ^ bytes4(keccak256("onConditionSet(uint256,bytes)"))
    const iface = new ethers.Interface([
      "function isConditionMet(uint256) external view returns (bool)",
      "function onConditionSet(uint256,bytes) external",
    ]);
    const sigA = iface.getFunction("isConditionMet")!.selector;
    const sigB = iface.getFunction("onConditionSet")!.selector;
    const expected =
      "0x" +
      (BigInt(sigA) ^ BigInt(sigB)).toString(16).padStart(8, "0");
    expect(await resolver.supportsInterface(expected)).to.equal(true);
  });
});
