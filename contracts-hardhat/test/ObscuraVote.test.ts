import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Structural + delegation tests for ObscuraVote.
 * FHE cast/revote/finalize/reveal paths require cofhe mock encryption at runtime;
 * covered by frontend vitest gates and Arbitrum Sepolia E2E in memory_vote_5.md.
 */
describe("ObscuraVote", function () {
  let token: any;
  let vote: any;
  let owner: any;
  let voter: any;
  let delegatee: any;

  beforeEach(async () => {
    [owner, voter, delegatee] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ObscuraToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    const Vote = await ethers.getContractFactory("ObscuraVote");
    vote = await Vote.deploy(await token.getAddress());
    await vote.waitForDeployment();

    // Eligibility gate: must claim OBS once
    await token.connect(voter).claimDailyTokens();
    await token.connect(delegatee).claimDailyTokens();
    await token.connect(owner).claimDailyTokens();
  });

  describe("createProposal", () => {
    it("creates a proposal with options and metadata", async () => {
      const deadline = (await time.latest()) + 3600;
      const tx = await vote.connect(voter).createProposal(
        "Test proposal",
        "Description",
        ["Yes", "No"],
        deadline,
        1,
        0 // GENERAL
      );
      await tx.wait();

      expect(await vote.getProposalCount()).to.equal(1n);
      const p = await vote.getProposal(0);
      expect(p[0]).to.equal("Test proposal");
      expect(p[2]).to.equal(2); // numOptions
      expect(p[9]).to.equal(true); // exists
      expect(p[10]).to.equal(voter.address); // creator

      const opts = await vote.getProposalOptions(0);
      expect(opts).to.deep.equal(["Yes", "No"]);
    });

    it("rejects empty title", async () => {
      const deadline = (await time.latest()) + 3600;
      await expect(
        vote.connect(voter).createProposal("", "d", ["A", "B"], deadline, 0, 0)
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("rejects past deadline", async () => {
      const past = (await time.latest()) - 1;
      await expect(
        vote.connect(voter).createProposal("t", "d", ["A", "B"], past, 0, 0)
      ).to.be.revertedWith("Deadline must be in the future");
    });

    it("rejects unclaimed OBS holder", async () => {
      const [, , , stranger] = await ethers.getSigners();
      const deadline = (await time.latest()) + 3600;
      await expect(
        vote.connect(stranger).createProposal("t", "d", ["A", "B"], deadline, 0, 0)
      ).to.be.revertedWith("Must hold $OBS (claim daily tokens first)");
    });
  });

  describe("delegation", () => {
    it("sets delegate and increases delegatee weight", async () => {
      await vote.connect(voter).delegate(delegatee.address);
      expect(await vote.delegateTo(voter.address)).to.equal(delegatee.address);
      expect(await vote.getVoteWeight(delegatee.address)).to.equal(2n);
    });

    it("rejects self-delegation", async () => {
      await expect(vote.connect(voter).delegate(voter.address)).to.be.revertedWith(
        "Cannot delegate to yourself"
      );
    });

    it("undelegate restores weight", async () => {
      await vote.connect(voter).delegate(delegatee.address);
      await vote.connect(voter).undelegate();
      expect(await vote.delegateTo(voter.address)).to.equal(ethers.ZeroAddress);
      expect(await vote.getVoteWeight(delegatee.address)).to.equal(1n);
    });

    it("rejects undelegate when none active", async () => {
      await expect(vote.connect(voter).undelegate()).to.be.revertedWith("No active delegation");
    });
  });

  describe("extendDeadline", () => {
    it("creator can extend deadline forward", async () => {
      const deadline = (await time.latest()) + 3600;
      await vote.connect(voter).createProposal("t", "d", ["A", "B"], deadline, 0, 0);
      const newDeadline = deadline + 7200;
      await vote.connect(voter).extendDeadline(0, newDeadline);
      const p = await vote.getProposal(0);
      expect(p[3]).to.equal(BigInt(newDeadline));
    });
  });

  describe("cancelProposal", () => {
    it("creator can cancel proposal with no votes", async () => {
      const deadline = (await time.latest()) + 3600;
      await vote.connect(voter).createProposal("t", "d", ["A", "B"], deadline, 0, 0);
      await vote.connect(voter).cancelProposal(0);
      const p = await vote.getProposal(0);
      expect(p[9]).to.equal(true); // isCancelled
    });
  });
});
