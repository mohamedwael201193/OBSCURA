import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.OBSCURA_PAY_ADDRESS;
  if (!contractAddress) {
    console.error("Set OBSCURA_PAY_ADDRESS env var");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  const obscuraPay = await ethers.getContractAt("ObscuraPay", contractAddress);

  const action = process.env.ACTION || "info";

  switch (action) {
    case "info": {
      const owner = await obscuraPay.owner();
      const count = await obscuraPay.getEmployeeCount();
      const employees = await obscuraPay.getEmployees();
      console.log("Owner:", owner);
      console.log("Employee Count:", count.toString());
      console.log("Employees:", employees);
      break;
    }
    case "grant-audit": {
      const auditor = process.env.AUDITOR_ADDRESS;
      if (!auditor) { console.error("Set AUDITOR_ADDRESS"); process.exit(1); }
      const tx = await obscuraPay.grantAuditAccess(auditor);
      await tx.wait();
      console.log("Audit access granted to:", auditor);
      break;
    }
    case "grant-role": {
      const user = process.env.USER_ADDRESS;
      const role = parseInt(process.env.ROLE || "0");
      if (!user) { console.error("Set USER_ADDRESS"); process.exit(1); }
      const tx = await obscuraPay.grantRole(user, role);
      await tx.wait();
      console.log(`Role ${role} granted to ${user}`);
      break;
    }
    default:
      console.log("Actions: info, grant-audit, grant-role");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
