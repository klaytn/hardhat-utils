import "@nomiclabs/hardhat-ethers/internal/type-extensions";
import "@nomiclabs/hardhat-ethers/types";
import "hardhat-deploy/dist/src/type-extensions";
import "hardhat/types/config";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import type ethers from "ethers";

declare module "hardhat/types/config" {
  export interface HardhatConfig {
    dodoc: {
      include: string[];
      exclude: string[];
      runOnCompile: boolean;
      debugMode: boolean;
      templatePath: string;
      outputDir: string;
      keepFileStructure: boolean;
      freshOutput: boolean;
    }
  }
}

// Extend `hre.ethers` next to the fields added by hardhat-ethers.
// See https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-ethers/src/types/index.ts
declare module "@nomiclabs/hardhat-ethers/types" {
  interface HardhatEthersHelpers {
    getWallet: (address: string) => Promise<ethers.Wallet>;
    getWallets: () => Promise<ethers.Wallet[]>;
  }
}

declare global {
  var hre: HardhatRuntimeEnvironment;
}
