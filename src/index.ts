import { extendEnvironment } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { extendHardhatEthers, PluginError } from "./helpers";

import "./type-extensions";

extendEnvironment((hre: HardhatRuntimeEnvironment) => {
  if (!hre.ethers) {
    throw PluginError("hardhat-ethers plugin not loaded. In your hardhat.config.js, please require or import '@nomiclabs/hardhat-ethers' before hardhat-utils");
  }
  if (!hre.deployments) {
    throw PluginError("hardhat-deploy plugin not loaded. In your hardhat.config.js, please require or import 'hardhat-deploy' before hardhat-utils");
  }

  // Lazy extend the `hre.ethers` object using the ES6 object Proxy
  hre.ethers = new Proxy(hre.ethers, extendHardhatEthers);
});

export * from "./tasks";
