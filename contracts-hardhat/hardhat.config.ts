import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@cofhe/hardhat-plugin";
import * as dotenv from "dotenv";
import "./tasks/deploy";
import "./tasks/create-proposal";

dotenv.config();

const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.25",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  networks: {
    "arb-sepolia": {
      url:
        process.env.ARBITRUM_SEPOLIA_RPC_URL ||
        "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: [PRIVATE_KEY],
      gasMultiplier: 1.2,
      timeout: 60000,
    },
  },
};

export default config;
