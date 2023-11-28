import { task } from "hardhat/config";
import _ from "lodash";

import { FromArgType, resolveFuncArgs, normalizeCallResult, normalizeRpcResult } from "../helpers";
import "../type-extensions";

export const TASK_SEND = "send";

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
    _.each(rc.logs, (log) => {
      const desc = contract.interface.parseLog(log);
      (log as any).eventName = desc.signature;
      (log as any).eventArgs = normalizeCallResult(desc.args);
    });

    if (json) {
      console.log(JSON.stringify(normalizeRpcResult(rc), null, 2));
    } else {
      const status = rc.status == 1 ? "ok" : `failed (status=${rc.status})`;
      console.log(`${status} (block ${rc.blockNumber}, gas used: ${rc.gasUsed.toString()})`);
      _.each(rc.logs, (log) => {
        console.log("emit", (log as any).eventName, JSON.stringify((log as any).eventArgs, null, 2));
      });
    }
  });
