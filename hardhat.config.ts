import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "./src"; // For testing; import "@klaytn/hardhat-utils" in your hardhat.config.ts.

const config: HardhatUserConfig = {
  solidity: "0.8.18",
}
export default config;
