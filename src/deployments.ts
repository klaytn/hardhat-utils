import { Deployment } from "hardhat-deploy/dist/types";
import { task } from "hardhat/config";
import { Artifact } from "hardhat/types";
import _ from "lodash";
import {launchBrowserSigner} from "./browser";

import { FromArgType, resolveFuncArgs, normalizeCallResult, normalizeRpcResult } from "./helpers";
import "./type-extensions";

export const TASK_ADDR = "addr";
export const TASK_CALL = "call";
export const TASK_SEND = "send";
export const TASK_IMPORT = "import";

task(TASK_ADDR, "Get address of a deployed contract")
  .addOptionalPositionalParam("name", "Contract name", "")
  .setAction(async (taskArgs) => {
    const { name } = taskArgs;
    if (name == "") {
      const deployments = await hre.deployments.all();
      console.log(_.mapValues(deployments, (d) => d.address));
    } else {
      const deployment = await hre.deployments.get(name);
      console.log(deployment.address);
    }
  });

// TODO: call and send: --gas-price, --gas-limit, --nonce
task(TASK_CALL, "Call a read-only function to a contract")
  .addOptionalParam("from", "Caller address or index", 0, FromArgType)
  .addOptionalParam("to", "Target address. Loaded from deployments if empty.", "")
  .addFlag("raw", "Print raw output")
  .addFlag("dec", "Print numbers in decimal (default is hex)")
  .addPositionalParam("name", "Contract name (example: 'Counter', 'src/Lock.sol:Lock')")
  .addPositionalParam("func", "Function name or signature (example: 'number()', 'balanceOf(address)')")
  .addVariadicPositionalParam("args", "call arguments", [])
  .setAction(async (taskArgs) => {
    const { func, raw, dec } = taskArgs;
    const { contract, sender, unsignedTx } = await resolveFuncArgs(taskArgs);

    let output = await sender.call(unsignedTx);
    if (raw) {
      console.log(output);
    } else {
      let res = contract.interface.decodeFunctionResult(func, output);
      console.log(normalizeCallResult(res, { dec }));
    }
  });

task(TASK_SEND, "Send a transaction to a contract")
  .addOptionalParam("from", "Caller address or index", 0, FromArgType)
  .addOptionalParam("to", "Target address. Loaded from deployments if empty.", "")
  .addFlag("unsigned", "Print unsigned tx and exit")
  .addFlag("browser", "Launch a webpage to sign tx on browser")
  .addFlag("dec", "Print numbers in decimal (default is hex)")
  .addPositionalParam("name", "Contract name (example: 'Counter', 'src/Lock.sol:Lock')")
  .addPositionalParam("func", "Function name or signature (example: 'number()', 'balanceOf(address)')")
  .addVariadicPositionalParam("args", "call arguments", [])
  .setAction(async (taskArgs) => {
		const { unsigned, browser, dec } = taskArgs;
		const { sender, unsignedTx } = await resolveFuncArgs(taskArgs);

		if (unsigned) {
			console.log(normalizeRpcResult(unsignedTx, { dec }));
			return;
		}

    let rc;
    if (browser) {
      const tx = await sender.populateTransaction(unsignedTx);
      const txhash = await launchBrowserSigner(tx);
      rc = await hre.ethers.provider.waitForTransaction(txhash);
    } else {
      const tx = await sender.sendTransaction(unsignedTx);
      rc = await tx.wait();
    }

    // TODO: decode events
    console.log(normalizeRpcResult(rc, { dec }));
  });

task(TASK_IMPORT, "Import a contract deployment")
  .addPositionalParam("contractName", "Contract name")
  .addPositionalParam("address", "Contract address")
  .addOptionalPositionalParam("txhash", "The deploy transaction hash", undefined)
  .setAction(async (taskArgs) => {
    const { contractName, address, txhash } = taskArgs;
    const d: Deployment = {
      address: address,
      abi: [],
    };

    let artifact: Artifact;
    try {
      artifact = await hre.artifacts.readArtifact(contractName);
    } catch {
      artifact = await hre.deployments.getArtifact(contractName);
    }
    d.abi = artifact.abi;

    if (txhash !== undefined) {
      d.transactionHash = txhash;
      d.receipt = await hre.ethers.provider.getTransactionReceipt(txhash)
    }

    d.deployedBytecode = await hre.ethers.provider.getCode(address);

    await hre.deployments.save(contractName, d);
    // Wait for the file creation. TODO: remove sleep
    // https://github.com/wighawag/hardhat-deploy/pull/436
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
