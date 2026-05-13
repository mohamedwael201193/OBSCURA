import { expect } from "chai";
import { ethers } from "hardhat";

// Structural tests for Wave 4 Credit. FHE-encrypted state transitions
// (supply / borrow / liquidate) are exercised by the on-chain smoke-test
// against deployed Arbitrum Sepolia contracts.
describe("ObscuraCredit", function () {
  const CUSDC = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";

  let deployer: any, gov: any, curator: any;
  let oracle: any, irm: any, factory: any, feed: any;

  beforeEach(async () => {
    [deployer, gov, curator] = await ethers.getSigners();
    const FeedF = await ethers.getContractFactory("MockChainlinkFeed");
    feed = await FeedF.deploy(ethers.parseUnits("1", 18));
    const OracleF = await ethers.getContractFactory("ObscuraCreditOracle");
    oracle = await OracleF.deploy(gov.address);
    const IrmF = await ethers.getContractFactory("ObscuraCreditIRM");
    irm = await IrmF.deploy(gov.address, 200n, 400n, 6000n, 8000n, 1000n);
    const FactoryF = await ethers.getContractFactory("ObscuraCreditFactory");
    factory = await FactoryF.deploy(gov.address);
  });

  describe("MockChainlinkFeed", () => {
    it("returns initial price", async () => {
      expect(await feed.latestAnswer()).to.equal(ethers.parseUnits("1", 18));
    });
    it("owner can update", async () => {
      await (await feed.set(ethers.parseUnits("2", 18))).wait();
      expect(await feed.latestAnswer()).to.equal(ethers.parseUnits("2", 18));
    });
  });

  describe("ObscuraCreditOracle", () => {
    it("stores governor immutable", async () => {
      expect(await oracle.governor()).to.equal(gov.address);
    });
    it("rejects non-governor setPublicFeed", async () => {
      await expect(oracle.connect(deployer).setPublicFeed(CUSDC, await feed.getAddress()))
        .to.be.revertedWithCustomError(oracle, "NotGovernor");
    });
  });

  describe("ObscuraCreditIRM", () => {
    it("stores plaintext mirror parameters", async () => {
      expect(await irm.baseBpsP()).to.equal(200n);
      expect(await irm.slope1BpsP()).to.equal(400n);
      expect(await irm.slope2BpsP()).to.equal(6000n);
      expect(await irm.kinkBpsP()).to.equal(8000n);
      expect(await irm.reserveBpsP()).to.equal(1000n);
    });
  });

  describe("ObscuraCreditFactory", () => {
    it("starts with empty markets", async () => {
      expect(await factory.allMarketsLength()).to.equal(0n);
    });
    it("rejects createMarket with unapproved LLTV", async () => {
      await expect(
        factory.connect(deployer).createMarket(CUSDC, CUSDC, await oracle.getAddress(), await irm.getAddress(), 7700n, 500n, 8500n)
      ).to.be.revertedWithCustomError(factory, "NotApproved");
    });
    it("creates market when all params approved", async () => {
      await factory.connect(gov).setApprovedLLTV(7700n, true);
      await factory.connect(gov).setApprovedLiqBonus(500n, true);
      await factory.connect(gov).setApprovedLiqThreshold(8500n, true);
      await factory.connect(gov).setApprovedIRM(await irm.getAddress(), true);
      await factory.connect(gov).setApprovedOracle(await oracle.getAddress(), true);
      const tx = await factory.createMarket(CUSDC, CUSDC, await oracle.getAddress(), await irm.getAddress(), 7700n, 500n, 8500n);
      await tx.wait();
      expect(await factory.allMarketsLength()).to.equal(1n);
    });
    it("rejects setApprovedLLTV from non-governor", async () => {
      await expect(factory.connect(deployer).setApprovedLLTV(7700n, true))
        .to.be.revertedWithCustomError(factory, "NotGovernor");
    });
  });

  describe("ObscuraCreditVault", () => {
    let vault: any;
    beforeEach(async () => {
      const VF = await ethers.getContractFactory("ObscuraCreditVault");
      vault = await VF.deploy(CUSDC, curator.address, deployer.address);
    });
    it("stores immutables and defaults", async () => {
      expect((await vault.loanAsset()).toLowerCase()).to.equal(CUSDC.toLowerCase());
      expect(await vault.curator()).to.equal(curator.address);
      expect(await vault.feeBps()).to.equal(1000);
    });
    it("rejects fee > 25%", async () => {
      await expect(vault.connect(deployer).setFee(2501, deployer.address))
        .to.be.revertedWith("fee>25%");
    });
    it("rejects approveMarket from non-curator", async () => {
      await expect(vault.connect(deployer).approveMarket(deployer.address, 100n))
        .to.be.revertedWithCustomError(vault, "NotCurator");
    });
  });

  describe("ObscuraCreditAuction", () => {
    it("starts empty", async () => {
      const A = await ethers.getContractFactory("ObscuraCreditAuction");
      const a = await A.deploy();
      expect(await a.auctionsLength()).to.equal(0n);
    });
  });

  describe("ObscuraCreditScore", () => {
    it("stores source addresses", async () => {
      const S = await ethers.getContractFactory("ObscuraCreditScore");
      const s = await S.deploy(deployer.address, deployer.address, deployer.address);
      expect(await s.payStream()).to.equal(deployer.address);
    });
  });

  describe("ObscuraCreditGovernanceProxy", () => {
    it("stores treasury + factory immutables", async () => {
      const P = await ethers.getContractFactory("ObscuraCreditGovernanceProxy");
      const p = await P.deploy(deployer.address, await factory.getAddress());
      expect(await p.treasury()).to.equal(deployer.address);
      expect(await p.factory()).to.equal(await factory.getAddress());
    });
  });

  describe("ObscuraConfidentialToken", () => {
    let tok: any;
    beforeEach(async () => {
      const TF = await ethers.getContractFactory("ObscuraConfidentialToken");
      tok = await TF.deploy("Confidential OBS", "cOBS", 8, 100_000_000n);
    });
    it("stores metadata", async () => {
      expect(await tok.name()).to.equal("Confidential OBS");
      expect(await tok.symbol()).to.equal("cOBS");
      expect(await tok.decimals()).to.equal(8);
      expect(await tok.faucetAmount()).to.equal(100_000_000n);
    });
    it("operator approval round-trip", async () => {
      await (await tok.connect(deployer).setOperator(curator.address, 9_999_999_999n)).wait();
      expect(await tok.isOperator(deployer.address, curator.address)).to.equal(true);
      expect(await tok.isOperator(deployer.address, gov.address)).to.equal(false);
    });
    it("nextFaucetIn is 0 for fresh user", async () => {
      expect(await tok.nextFaucetIn(deployer.address)).to.equal(0n);
    });
    it("publicSupplyMirror starts at zero", async () => {
      expect(await tok.publicSupplyMirror()).to.equal(0n);
      expect(await tok.totalFaucetClaims()).to.equal(0n);
    });
  });
});
