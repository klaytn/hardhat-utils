import { ethers } from "ethers5";
import { task } from "hardhat/config";
import _ from "lodash";
import * as _path from "path";

import { FromArgType } from "../helpers";
import "../type-extensions";

export const TASK_ACCOUNTS = "accounts";

task(TASK_ACCOUNTS, "Get infromation about active accounts")
  .addOptionalParam("from", "Caller address or index", "", FromArgType)
  .addFlag("json", "Print output in json")
  .setAction(async (taskArgs) => {
    const { from, json } = taskArgs;

    let signers: ethers.Signer[];
    if (from == "") {
      signers = await hre.ethers.getSigners();
    } else {
      signers = [await hre.ethers.provider.getSigner(from)];
    }

    const out = [];
    for (const signer of signers) {
      const address = await signer.getAddress();
      const balance = ethers.utils.formatEther(
        await hre.ethers.provider.getBalance(address)
      );
      out.push({ address, balance });
    }

    if (json) {
      console.log(JSON.stringify(out, null, 2));
    } else {
      console.log("    address                                    balance");
      out.forEach((info, idx) => {
        console.log(idx.toString().padStart(3, ' '), info.address, info.balance);
      });
    }
  });
