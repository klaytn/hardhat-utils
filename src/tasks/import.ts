import { Deployment } from "hardhat-deploy/dist/types";
import { task } from "hardhat/config";
import { Artifact } from "hardhat/types";
import _ from "lodash";

import "../type-extensions";
import { PluginError, getArtifact } from "../helpers";

export const TASK_IMPORT = "import";

task(TASK_IMPORT, "Import a contract deployment")
  .addPositionalParam("contractName", "Contract name")
  .addPositionalParam("address", "Contract address")
  .addOptionalPositionalParam("txhash", "The deploy transaction hash", undefined)
  .addFlag("overwrite", "Overwrite existing deployment (if exists)")
  .addFlag("noAbi", "Do not load ABI. Use it when the contract is externally deployed.")
  .setAction(async (taskArgs) => {
    const { contractName, address, txhash, overwrite, noAbi } = taskArgs;
    const d: Deployment = {
      address: address,
      abi: [],
    };

    const existing = await hre.deployments.getOrNull(contractName);
    if (existing != null && existing.address.toLowerCase() != address.toLowerCase() && !overwrite) {
      throw PluginError(`Contract '${contractName}' already deployed at ${existing.address}. Use '--overwrite' to overwrite.`);
    }

    if (txhash) {
      d.transactionHash = txhash;
      d.receipt = await hre.ethers.provider.getTransactionReceipt(txhash)
    }

    if (!noAbi) {
      try {
      const artifact = await getArtifact(contractName);
      d.abi = artifact.abi;
      } catch {
        throw PluginError(`Cannot find ABI of '${contractName}'. Use '--no-abi' to skip loading ABI.`);
      }
    }

    d.deployedBytecode = await hre.ethers.provider.getCode(address);

    await hre.deployments.save(contractName, d);
    // Wait for the file creation. Needed if hardhat-deploy < 0.11.40
    // https://github.com/wighawag/hardhat-deploy/pull/436
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
