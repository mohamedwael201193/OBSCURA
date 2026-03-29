import { expect } from "chai";
import { ethers } from "hardhat";

describe("ObscuraPermissions", function () {
  let obscuraPay: any;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const ObscuraPay = await ethers.getContractFactory("ObscuraPay");
    obscuraPay = await ObscuraPay.deploy();
    await obscuraPay.waitForDeployment();
  });

  describe("Role Management", function () {
    it("should set deployer as owner", async function () {
      expect(await obscuraPay.owner()).to.equal(owner.address);
    });

    it("should set deployer role to ADMIN (1)", async function () {
      expect(await obscuraPay.roles(owner.address)).to.equal(1);
    });

    it("should allow owner to grant a role", async function () {
      await obscuraPay.grantRole(user1.address, 3); // AUDITOR
      expect(await obscuraPay.roles(user1.address)).to.equal(3);
    });

    it("should allow owner to revoke a role", async function () {
      await obscuraPay.grantRole(user1.address, 2); // EMPLOYEE
      await obscuraPay.revokeRole(user1.address);
      expect(await obscuraPay.roles(user1.address)).to.equal(0); // NONE
    });

    it("should revert when non-owner tries to grant role", async function () {
      await expect(
        obscuraPay.connect(user1).grantRole(user2.address, 2)
      ).to.be.revertedWith("Only owner");
    });

    it("should revert when non-owner tries to revoke role", async function () {
      await expect(
        obscuraPay.connect(user1).revokeRole(user2.address)
      ).to.be.revertedWith("Only owner");
    });
  });
});
