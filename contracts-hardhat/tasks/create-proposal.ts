import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs";
import * as path from "path";

task("create-proposal", "Create a test proposal via CLI")
  .addParam("title", "Proposal title")
  .addOptionalParam("description", "Proposal description", "")
  .addOptionalParam("options", "Comma-separated options", "Yes,No")
  .addOptionalParam("hours", "Hours until deadline", "24")
  .addOptionalParam("quorum", "Minimum votes required (0 = none)", "0")
  .addOptionalParam("category", "Category index (0-5)", "0")
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();

    // Read deployment
    const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
    if (!fs.existsSync(file)) {
      throw new Error("No deployment file found. Run deploy-obscura first.");
    }
    const deployments = JSON.parse(fs.readFileSync(file, "utf8"));
    const voteAddr = deployments.ObscuraVote;
    if (!voteAddr) throw new Error("ObscuraVote not found in deployments");

    console.log(`\nCreating proposal on ${network.name}...`);
    console.log(`Vote contract: ${voteAddr}`);
    console.log(`Deployer: ${deployer.address}`);

    const vote = await ethers.getContractAt("ObscuraVote", voteAddr);

    // Check permissions
    const owner = await vote.owner();
    const role = await vote.roles(deployer.address);
    console.log(`Owner: ${owner}, Deployer role: ${role} (1=ADMIN)`);

    const deadline = Math.floor(Date.now() / 1000) + Number(args.hours) * 3600;
    const optionsList = args.options.split(",").map((o: string) => o.trim());
    const quorum = Number(args.quorum);
    const category = Number(args.category);

    console.log(`Title: ${args.title}`);
    console.log(`Description: ${args.description || "(none)"}`);
    console.log(`Options: ${optionsList.join(", ")}`);
    console.log(`Deadline: ${new Date(deadline * 1000).toISOString()}`);
    console.log(`Quorum: ${quorum}, Category: ${category}`);

    console.log("\nSending TX...");
    const tx = await vote.createProposal(
      args.title,
      args.description,
      optionsList,
      deadline,
      quorum,
      category,
      { gasLimit: 5_000_000 }
    );
    console.log(`TX hash: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`Status: ${receipt!.status === 1 ? "SUCCESS" : "REVERTED"}`);
    console.log(`Gas used: ${receipt!.gasUsed.toString()}`);

    if (receipt!.status === 1) {
      const count = await vote.getProposalCount();
      console.log(`Total proposals: ${count.toString()}`);
    }
  });
