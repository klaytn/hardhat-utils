import { task } from "hardhat/config";
import _ from "lodash";
import { getArtifact, getArtifactNames, stringifyAbi } from "../helpers";

import "../type-extensions";

export const TASK_ABI = "abi";

task(TASK_ABI, "Get ABI of a contract")
  .addFlag("json", "print json abi")
  .addOptionalPositionalParam("name", "Contract name (leave empty to use all contracts)", "")
  .setAction(async (taskArgs) => {
    const { name, json } = taskArgs;

    let names: string[];
    if (name == "") {
      names = await getArtifactNames();
    } else {
      names = [name];
    }

    if (json) {
      const abis: Record<string, any> = {};
      for (const name of names) {
        const artifact = await getArtifact(name);
        abis[name] = artifact.abi;
      }
      console.log(JSON.stringify(abis));
    } else {
      for (const name of names) {
        const artifact = await getArtifact(name);
        console.log(`# ${name}`); // print contract name
        console.log(await stringifyAbi(artifact.abi, json));
        console.log();
      }
    }
  });