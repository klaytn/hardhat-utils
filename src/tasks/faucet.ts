import { task } from "hardhat/config";
import _ from "lodash";
import * as _path from "path";

import { FromArgType, PluginError } from "../helpers";
import "../type-extensions";

export const TASK_FAUCET = "faucet";

task(TASK_FAUCET, "Send some coins to other accounts")
  .addOptionalParam("from", "Sender address or index", 0, FromArgType)
  .addOptionalParam("to", "A comma-separated string of recipient addresses and indices. By default all signers", "")
  .addOptionalParam("amount", "Amount of coins to send in ETH", "1")
  .setAction(async (taskArgs) => {
    const { from, to, amount } = taskArgs;

    const sender = await hre.ethers.getSigner(from);
    const value = hre.ethers.utils.parseEther(amount);

    const recipients: string[] = [];
    if (to == "") {
      const allSigners = await hre.ethers.getSigners();
      for (const signer of allSigners) {
        recipients.push(await signer.getAddress());
      }
    } else {
      for (const token of _.split(to, ",")) {
        if (hre.ethers.utils.isAddress(token)) { // address
          recipients.push(token);
        } else if (/^\d+$/.test(token)) { // index
          const signer = await hre.ethers.getSigner(_.toNumber(token) as any);
          recipients.push(await signer.getAddress());
        } else {
          throw PluginError(`Not an address or index: ${token}`);
        }
      }
    }

    console.log(`Send from ${sender.address} to ${recipients.length} accounts ${amount} ETH each`);

    const txs = [];
    for (const recipient of recipients) {
      const tx = await sender.sendTransaction({
        to: recipient,
        value: value
      });
      txs.push(tx.wait());
    }

    const rcs = await Promise.all(txs);
    for (const rc of rcs) {
      console.log(`to ${rc.to} txid ${rc.transactionHash}`);
    }
  });
