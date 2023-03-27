import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "./src";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
}
export default config;
