import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "./src"; // For testing; import "@klaytn/hardhat-utils" in your hardhat.config.ts.

const accounts = [
  process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
];

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    localhost: {
      url: process.env.RPC_URL || "http://localhost:8545",
      accounts: accounts,
    },
    baobab: {
      url: process.env.RPC_URL || "https://public-en-baobab.klaytn.net",
      accounts: accounts,
    },
    cypress: {
      url: process.env.RPC_URL || "https://public-en-cypress.klaytn.net",
      accounts: accounts,
    }
  }
}
export default config;
