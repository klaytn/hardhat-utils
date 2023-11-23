import { task } from "hardhat/config";
import _ from "lodash";
import { getArtifact, getArtifactNames, stringifyAbi } from "../helpers";

import "../type-extensions";

export const TASK_ABI = "abi";

task(TASK_ABI, "Get ABI of a contract")
  .addFlag("json", "print json abi")
  .addOptionalPositionalParam("name", "Contract name (all contracts if empty)", "")
  .setAction(async (taskArgs) => {
    const { name, json } = taskArgs;

    let names: string[];
    if (name == "") {
      names = await getArtifactNames();
    } else {
      names = [name];
    }

    for (const name of names) {
      const artifact = await getArtifact(name);
      const abi = await stringifyAbi(artifact.abi, json);
      if (abi && abi.length > 0 && abi != "[]") { // skip empty artifact
        console.log(`# ${name}`); // print contract name
        console.log(abi);
        console.log();
      }
    }
  });