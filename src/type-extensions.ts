import "@nomicfoundation/hardhat-ethers/internal/type-extensions";
import "@nomicfoundation/hardhat-ethers/types";
import "hardhat-deploy/dist/src/type-extensions";
import "hardhat/types/config";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Wallet } from "ethers5";

declare module "hardhat/types/config" {
  export interface HardhatConfig {
  }
}

// Extend `hre.ethers` next to the fields added by hardhat-ethers.
// See https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-ethers/src/types/index.ts
declare module "@nomicfoundation/hardhat-ethers/types" {
  interface HardhatEthersHelpers {
    getWallet: (address: string) => Promise<Wallet>;
    getWallets: () => Promise<Wallet[]>;
  }
}

declare global {
  var hre: HardhatRuntimeEnvironment;
}
