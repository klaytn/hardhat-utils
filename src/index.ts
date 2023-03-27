import { extendEnvironment } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { PluginError } from "./helpers";

import "./type-extensions";

extendEnvironment((hre: HardhatRuntimeEnvironment) => {
  if (!hre.ethers) {
    throw PluginError("hardhat-ethers plugin not loaded. In your hardhat.config.js, please require or import '@nomiclabs/hardhat-ethers' before hardhat-utils");
  }
  if (!hre.deployments) {
    throw PluginError("hardhat-deploy plugin not loaded. In your hardhat.config.js, please require or import 'hardhat-deploy' before hardhat-utils");
  }
  // Because hardhat-dodoc is a non-critical feature, don't check here.
});

export * from "./abi";
export * from "./accounts";
export * from "./blockscout";
export * from "./deployments";
export * from "./docs";
export * from "./flat";
