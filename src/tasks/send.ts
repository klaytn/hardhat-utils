import { task } from "hardhat/config";
import { Log } from "@ethersproject/abstract-provider";
import _ from "lodash";

import { FromArgType, resolveFuncArgs, normalizeCallResult, normalizeRpcResult } from "../helpers";
import "../type-extensions";

export const TASK_SEND = "send";

interface ParsedLog extends Log {
  eventName?: string;
  eventArgs?: string;
}

task(TASK_SEND, "Send a transaction to a contract")
  .addOptionalParam("from", "Caller address or index", 0, FromArgType)
  .addOptionalParam("to", "Target address. Loaded from deployments if empty.", "")
  .addFlag("unsigned", "Print unsigned tx and exit")
  .addFlag("json", "Print receipt in json")
  .addPositionalParam("name", "Contract name (example: 'Counter', 'src/Lock.sol:Lock')")
  .addPositionalParam("func", "Function name or signature (example: 'number()', 'balanceOf(address)')")
  .addVariadicPositionalParam("args", "call arguments", [])
  .setAction(async (taskArgs) => {
    const { unsigned, json, name, func } = taskArgs;
    const { contract, sender, unsignedTx } = await resolveFuncArgs(taskArgs);

    if (unsigned) {
      console.log(normalizeRpcResult(unsignedTx));
      return;
    }

    const tx = await sender.sendTransaction(unsignedTx);
    if (!json) {
      process.stdout.write(`sent ${name}#${func} (tx: ${tx.hash})...`);
    }

    const rc = await tx.wait();
    _.each(rc.logs, (log: ParsedLog) => {
      try {
        const desc = contract.interface.parseLog(log);
        log.eventName = desc.signature;
        log.eventArgs = normalizeCallResult(desc.args);
      } catch (e) {}
    });

    if (json) {
      console.log(JSON.stringify(normalizeRpcResult(rc), null, 2));
    } else {
      const status = rc.status == 1 ? "ok" : `failed (status=${rc.status})`;
      console.log(`${status} (block ${rc.blockNumber}, gas used: ${rc.gasUsed.toString()})`);
      _.each(rc.logs, (log: ParsedLog) => {
        if (log.eventName) {
          console.log("emit", log.eventName, JSON.stringify(log.eventArgs, null, 2));
        }
      });
    }
  });
