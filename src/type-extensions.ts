import "@nomiclabs/hardhat-ethers/internal/type-extensions";
import "hardhat-deploy/dist/src/type-extensions";
import {HardhatRuntimeEnvironment} from "hardhat/types";
import "hardhat/types/config";

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

declare global {
  var hre: HardhatRuntimeEnvironment;
}
